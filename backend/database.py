import os
import logging
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from models import Base

# Load environment variables
load_dotenv()

logger = logging.getLogger("aicte_database")
logging.basicConfig(level=logging.INFO)

# Determine database URL:
# 1. User-configured DATABASE_URL (e.g. Supabase or PostgreSQL)
# 2. Serverless fallback on Vercel/Lambda (/tmp/aicte.db)
# 3. Clean local default: SQLite with WAL mode (./aicte.db)
raw_db_url = os.getenv("DATABASE_URL", "").strip()

if not raw_db_url:
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        DATABASE_URL = "sqlite:////tmp/aicte.db"
    else:
        DATABASE_URL = "sqlite:///./aicte.db"
else:
    DATABASE_URL = raw_db_url

# Standardize PostgreSQL / Supabase dialect prefixes
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Ensure Supabase connections use SSL
if "supabase" in DATABASE_URL and "sslmode=" not in DATABASE_URL:
    delimiter = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{delimiter}sslmode=require"


def get_engine():
    """
    Creates and returns an optimized SQLAlchemy Engine.
    - If SQLite: configures WAL mode, normal synchronous writes, and memory cache for sub-millisecond queries.
    - If PostgreSQL / Supabase: configures connection pooling, pre-ping, and timeout.
    """
    try:
        if "sqlite" in DATABASE_URL:
            eng = create_engine(
                DATABASE_URL,
                connect_args={"check_same_thread": False, "timeout": 15},
                pool_pre_ping=True,
            )

            # Enable Write-Ahead Logging (WAL) and performance optimizations for SQLite
            @event.listens_for(eng, "connect")
            def set_sqlite_pragma(dbapi_connection, connection_record):
                cursor = dbapi_connection.cursor()
                try:
                    cursor.execute("PRAGMA journal_mode=WAL")
                    cursor.execute("PRAGMA synchronous=NORMAL")
                    cursor.execute("PRAGMA cache_size=10000")
                    cursor.execute("PRAGMA foreign_keys=ON")
                except Exception as pragma_err:
                    logger.debug(f"SQLite PRAGMA tuning notice: {pragma_err}")
                finally:
                    cursor.close()

            logger.info("Database: Running on high-performance local SQLite (WAL Mode).")
            return eng
        else:
            # PostgreSQL / Supabase
            eng = create_engine(
                DATABASE_URL,
                pool_size=10,
                max_overflow=20,
                pool_recycle=300,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 5},
            )
            # Verify connection
            with eng.connect():
                pass
            # Mask credentials for logging
            masked = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "configured host"
            logger.info(f"Database: Connected successfully to PostgreSQL/Supabase @ {masked}")
            return eng

    except Exception as e:
        logger.warning(
            f"Could not connect to database ({DATABASE_URL}): {e}. "
            "Falling back to local SQLite database (sqlite:///./aicte.db)."
        )
        fallback_url = "sqlite:///./aicte.db"
        fallback_eng = create_engine(fallback_url, connect_args={"check_same_thread": False})
        return fallback_eng


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """Create all tables in the database."""
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized successfully.")


def get_db():
    """FastAPI Dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
