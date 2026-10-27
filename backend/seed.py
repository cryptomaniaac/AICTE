import logging
from sqlalchemy.orm import Session
from database import SessionLocal, init_db, engine
import hashlib
from models import Institution, Application, Undertaking, LeaseAndDocument, AuditLog, RegionEnum, Applicant

logger = logging.getLogger("aicte_seed")
logging.basicConfig(level=logging.INFO)

AUTH_SALT = "aicte_sih26262_secret_salt"

def get_seed_hash(pw: str) -> str:
    return hashlib.sha256(f"{AUTH_SALT}:{pw}".encode("utf-8")).hexdigest()

# Exact institutions corresponding to the original frontend mock data

MOCK_INSTITUTIONS = [
    {"id": "INST-2611", "name": "Nandi Institute of Technology", "region": RegionEnum.South},
    {"id": "INST-2612", "name": "Rajmata College of Engineering", "region": RegionEnum.West},
    {"id": "INST-2613", "name": "Himalaya Polytechnic", "region": RegionEnum.North},
    {"id": "INST-2614", "name": "Kaveri School of Management", "region": RegionEnum.South},
    {"id": "INST-2615", "name": "Gangetic Institute of Pharmacy", "region": RegionEnum.East},
    {"id": "INST-2616", "name": "Thar Technical Campus", "region": RegionEnum.North},
    {"id": "INST-2617", "name": "Konkan Architecture Institute", "region": RegionEnum.West},
    {"id": "INST-2618", "name": "Brahmaputra Engineering College", "region": RegionEnum.East},
    {"id": "INST-2619", "name": "Deccan Institute of Computing", "region": RegionEnum.South},
    {"id": "INST-2620", "name": "Malwa Polytechnic", "region": RegionEnum.West},
    {"id": "INST-2621", "name": "Sundarban Tech University", "region": RegionEnum.East},
    {"id": "INST-2622", "name": "Punjab Institute of Design", "region": RegionEnum.North},
]

# Exact applications corresponding to:
# [['A-2611', 'Nandi Institute of Technology', 'South', 'SE', 1, 24, 6], ...]
MOCK_APPLICATIONS = [
    {"id": "A-2611", "institution_id": "INST-2611", "route_type": "SE", "current_stage_index": 1, "age_in_days": 24, "evc_timeline_status": 6},
    {"id": "A-2612", "institution_id": "INST-2612", "route_type": "S", "current_stage_index": 0, "age_in_days": 17, "evc_timeline_status": 0},
    {"id": "A-2613", "institution_id": "INST-2613", "route_type": "ES", "current_stage_index": 0, "age_in_days": 9, "evc_timeline_status": 12},
    {"id": "A-2614", "institution_id": "INST-2614", "route_type": "SES", "current_stage_index": 2, "age_in_days": 22, "evc_timeline_status": 0},
    {"id": "A-2615", "institution_id": "INST-2615", "route_type": "SE", "current_stage_index": 0, "age_in_days": 6, "evc_timeline_status": 0},
    {"id": "A-2616", "institution_id": "INST-2616", "route_type": "E", "current_stage_index": 0, "age_in_days": 34, "evc_timeline_status": -4},
    {"id": "A-2617", "institution_id": "INST-2617", "route_type": "SE", "current_stage_index": 1, "age_in_days": 12, "evc_timeline_status": 18},
    {"id": "A-2618", "institution_id": "INST-2618", "route_type": "ES", "current_stage_index": 1, "age_in_days": 5, "evc_timeline_status": 0},
    {"id": "A-2619", "institution_id": "INST-2619", "route_type": "S", "current_stage_index": 0, "age_in_days": 14, "evc_timeline_status": 0},
    {"id": "A-2620", "institution_id": "INST-2620", "route_type": "E", "current_stage_index": 0, "age_in_days": 18, "evc_timeline_status": 26},
    {"id": "A-2621", "institution_id": "INST-2621", "route_type": "SES", "current_stage_index": 1, "age_in_days": 27, "evc_timeline_status": -9},
    {"id": "A-2622", "institution_id": "INST-2622", "route_type": "SE", "current_stage_index": 0, "age_in_days": 3, "evc_timeline_status": 0},
]

# Exact undertakings corresponding to:
# [['Nandi Institute of Technology', 'South', 'Complete fire-safety NOC', -12, 0], ...]
MOCK_UNDERTAKINGS = [
    {"institution_id": "INST-2611", "condition_text": "Complete fire-safety NOC", "due_days": -12, "status": 0},
    {"institution_id": "INST-2613", "condition_text": "Appoint 4 faculty members", "due_days": 9, "status": 0},
    {"institution_id": "INST-2617", "condition_text": "Library accreditation proof", "due_days": 22, "status": 1},
    {"institution_id": "INST-2621", "condition_text": "Laboratory equipment evidence", "due_days": -3, "status": 1},
    {"institution_id": "INST-2620", "condition_text": "Playground land mutation", "due_days": 41, "status": 0},
    {"institution_id": "INST-2619", "condition_text": "Deposit corpus fund", "due_days": 14, "status": 0},
]

# Exact leases & documents corresponding to:
# [['Rajmata College of Engineering', 'West', 'Campus lease deed', -5, 0], ...]
MOCK_LEASES = [
    {"institution_id": "INST-2612", "document_type": "Campus lease deed", "expiry_days": -5, "status": 0},
    {"institution_id": "INST-2616", "document_type": "Campus lease deed", "expiry_days": 12, "status": 0},
    {"institution_id": "INST-2615", "document_type": "Hostel lease", "expiry_days": 58, "status": 0},
    {"institution_id": "INST-2614", "document_type": "Campus lease deed", "expiry_days": 6, "status": 1},
    {"institution_id": "INST-2622", "document_type": "Lease registration", "expiry_days": -22, "status": 0},
    {"institution_id": "INST-2618", "document_type": "Campus lease deed", "expiry_days": 140, "status": 0},
]

# Initial audit trail log
MOCK_AUDIT_LOGS = [
    {"timestamp": "25 Oct · 09:00", "actor": "System", "event_description": "Nightly deadline scan completed for all regions"}
]

MOCK_APPLICANTS = [
    {
        "name": "Dr. Ramesh Sharma",
        "email": "ramesh@nandi.edu.in",
        "password_hash": get_seed_hash("Admin@123"),
        "phone": "+91 98450 12345",
        "institution_name": "Nandi Institute of Technology",
        "institution_id": "INST-2611",
        "region": RegionEnum.South,
        "route_type": "SE",
        "role": "Institution",
        "application_id": "A-2611",
        "created_at": "25 Oct · 09:15"
    },
    {
        "name": "Dr. Priya Desai",
        "email": "director@rajmata.ac.in",
        "password_hash": get_seed_hash("Admin@123"),
        "phone": "+91 98220 54321",
        "institution_name": "Rajmata College of Engineering",
        "institution_id": "INST-2612",
        "region": RegionEnum.West,
        "route_type": "S",
        "role": "Institution",
        "application_id": "A-2612",
        "created_at": "25 Oct · 09:30"
    },
    {
        "name": "Prof. Arvind Kumar",
        "email": "arvind@himalaya.edu.in",
        "password_hash": get_seed_hash("Admin@123"),
        "phone": "+91 94190 87654",
        "institution_name": "Himalaya Polytechnic",
        "institution_id": "INST-2613",
        "region": RegionEnum.North,
        "route_type": "ES",
        "role": "Institution",
        "application_id": "A-2613",
        "created_at": "25 Oct · 10:00"
    },
    {
        "name": "Dr. Ananya Roy",
        "email": "ananya@sundarban.edu.in",
        "password_hash": get_seed_hash("Admin@123"),
        "phone": "+91 98310 99887",
        "institution_name": "Sundarban Tech University",
        "institution_id": "INST-2621",
        "region": RegionEnum.East,
        "route_type": "SES",
        "role": "Institution",
        "application_id": "A-2621",
        "created_at": "25 Oct · 10:45"
    }
]

def seed_database(db: Session, force: bool = False):
    """
    Populates the database with initial mock data matching the frontend script.
    If data already exists and force is False, seeding is skipped (except for missing applicants).
    """
    if force:
        # Delete existing in reverse order of foreign keys
        db.query(AuditLog).delete()
        db.query(Applicant).delete()
        db.query(LeaseAndDocument).delete()
        db.query(Undertaking).delete()
        db.query(Application).delete()
        db.query(Institution).delete()
        db.commit()

    if force or db.query(Institution).count() == 0:
        logger.info("Seeding database with AICTE initial mock data...")

        # 1. Seed Institutions
        for inst in MOCK_INSTITUTIONS:
            db.add(Institution(**inst))
        db.commit()

        # 2. Seed Applications
        for app in MOCK_APPLICATIONS:
            db.add(Application(**app))
        db.commit()

        # 3. Seed Undertakings
        for un in MOCK_UNDERTAKINGS:
            db.add(Undertaking(**un))
        db.commit()

        # 4. Seed Leases & Documents
        for doc in MOCK_LEASES:
            db.add(LeaseAndDocument(**doc))
        db.commit()

        # 5. Seed Audit Logs
        for log in MOCK_AUDIT_LOGS:
            db.add(AuditLog(**log))
        db.commit()

    # Seed applicants if not present
    if force or db.query(Applicant).count() == 0:
        logger.info("Seeding initial mock applicants...")
        for ap in MOCK_APPLICANTS:
            db.add(Applicant(**ap))
        db.commit()

    logger.info("Database seeding successfully completed!")


if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        seed_database(db, force=True)
    finally:
        db.close()
