import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from models import Base

# Load environment variables
load_dotenv()

logger = logging.getLogger("aicte_database")
logging.basicConfig(level=logging.INFO)

# Default to PostgreSQL, with flexible fallback
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        DATABASE_URL = "sqlite:////tmp/aicte.db"
    else:
        DATABASE_URL = "postgresql+psycopg://postgres:postgres@localhost:5432/aicte_db"

# Handle older postgres:// format for compatibility
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

def get_engine():
    """
    Creates and returns a SQLAlchemy Engine.
    Tries PostgreSQL first; if unavailable, falls back to SQLite for instant local execution.
    """
    try:
        if "sqlite" in DATABASE_URL:
            eng = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
        else:
            eng = create_engine(DATABASE_URL, pool_pre_ping=True)
            # Test connection
            with eng.connect():
                pass
            logger.info(f"Connected successfully to database: {DATABASE_URL}")
            return eng
    except Exception as e:
        fallback_path = "/tmp/aicte.db" if (os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or not os.access(".", os.W_OK)) else "./aicte.db"
        fallback_url = f"sqlite:///{fallback_path}"
        logger.warning(
            f"Could not connect to configured database ({DATABASE_URL}): {e}. "
            f"Falling back to local SQLite database ({fallback_url}) for execution."
        )
        eng = create_engine(fallback_url, connect_args={"check_same_thread": False})
        return eng

    return eng

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
