import csv
import io
import hashlib
from datetime import datetime
from typing import List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload

from database import init_db, get_db, SessionLocal
from models import Institution, Application, Undertaking, LeaseAndDocument, AuditLog, SystemConfig, RegionEnum, Applicant
from seed import seed_database
import schemas

AUTH_SALT = "aicte_sih26262_secret_salt"

def hash_password(password: str) -> str:
    return hashlib.sha256(f"{AUTH_SALT}:{password}".encode("utf-8")).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password


# Route mapping and SLAs matching frontend business logic
ROUTE_STAGES = {
    "S": ["Scrutiny"],
    "SE": ["Scrutiny", "EVC"],
    "ES": ["EVC", "SAC/SHC"],
    "E": ["EVC"],
    "SES": ["Scrutiny", "EVC", "SAC/SHC"]
}

STAGE_SLA = {
    "Scrutiny": 15,
    "EVC": 30,
    "SAC/SHC": 20
}

def format_timestamp() -> str:
    now = datetime.now()
    return f"{now.strftime('%d %b')} · {now.strftime('%H:%M')}"

def calculate_escalation_level(days: int) -> str:
    if days < -7:
        return "L3"
    elif days < 0:
        return "L2"
    elif days <= 15:
        return "L1"
    return "—"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure tables exist and seed mock data if empty
    init_db()
    db = SessionLocal()
    try:
        seed_database(db, force=False)
        configs = db.query(SystemConfig).filter(SystemConfig.key.like("sla_%")).all()
        for cfg in configs:
            stage_name = cfg.key.replace("sla_", "")
            try:
                STAGE_SLA[stage_name] = int(cfg.value)
            except ValueError:
                pass
    finally:
        db.close()
    yield

app = FastAPI(
    title="AICTE Approval Workflow Automation and Compliance Monitoring System",
    description="Backend REST API for SIH26262 AICTE Approval & Compliance Monitor",
    version="1.1.0",
    lifespan=lifespan
)

# ----------------- CORS Middleware Configuration -----------------
# Configured for localhost:3000 and 3001
origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Root & Health Check -----------------
@app.get("/")
def root():
    return {
        "system": "AICTE Approval & Compliance Monitor API (SIH26262)",
        "status": "online",
        "docs_url": "/docs"
    }

# Real-time state synchronization
LIVE_STATE = {
    "version": 1,
    "timestamp": format_timestamp(),
    "last_event": "System initialized and monitoring active",
    "status": "online"
}

def record_live_event(event_desc: str):
    LIVE_STATE["version"] += 1
    LIVE_STATE["timestamp"] = format_timestamp()
    LIVE_STATE["last_event"] = event_desc

@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/api/health", methods=["GET", "HEAD"])
def health_check():
    return {
        "status": "healthy",
        "timestamp": format_timestamp(),
        "version": LIVE_STATE["version"]
    }

@app.get("/api/live/status")
def get_live_status(db: Session = Depends(get_db)):
    """Lightweight real-time status and version indicator for smooth polling."""
    return {
        "status": "online",
        "version": LIVE_STATE["version"],
        "timestamp": LIVE_STATE["timestamp"],
        "last_event": LIVE_STATE["last_event"],
        "total_applications": db.query(Application).count(),
    }

@app.post("/api/triggers/simulated-event")
def trigger_simulated_backend_event(db: Session = Depends(get_db)):
    """Triggers an autonomous event cycle directly on the persistent database."""
    import random
    actions = ["new_app", "evc_advance", "doc_upload", "sla_tick"]
    choice = random.choice(actions)

    if choice == "new_app":
        inst = db.query(Institution).first()
        if inst:
            app_count = db.query(Application).count()
            new_app_id = f"APP-2026-N{app_count + 1:04d}"
            route = random.choice(["SE", "S", "SES"])
            new_app = Application(
                id=new_app_id,
                institution_id=inst.id,
                route_type=route,
                current_stage_index=0,
                age_in_days=9,
                evc_timeline_status=random.randint(5, 14),
                deficiency_count=random.randint(0, 2),
                last_updated=datetime.utcnow()
            )
            db.add(new_app)
            event_text = f"New Application: {inst.name} ({new_app_id}) submitted under Route {route}"
            db.add(AuditLog(timestamp=format_timestamp(), actor="Institution Portal", event_description=event_text))
            db.commit()
            record_live_event(event_text)
            return {"status": "success", "event": event_text, "version": LIVE_STATE["version"], "app_id": new_app_id}

    elif choice == "evc_advance":
        app_obj = db.query(Application).options(joinedload(Application.institution)).filter(Application.route_type.in_(["SE", "SES", "ES"])).first()
        if app_obj:
            stages = ROUTE_STAGES.get(app_obj.route_type, [])
            app_obj.current_stage_index = min(len(stages) - 1, app_obj.current_stage_index + 1)
            event_text = f"Autonomous EVC Review: {app_obj.institution.name} ({app_obj.id}) advanced"
            db.add(AuditLog(timestamp=format_timestamp(), actor="EVC Committee", event_description=event_text))
            db.commit()
            record_live_event(event_text)
            return {"status": "success", "event": event_text, "version": LIVE_STATE["version"], "app_id": app_obj.id}

    elif choice == "doc_upload":
        doc = db.query(LeaseAndDocument).options(joinedload(LeaseAndDocument.institution)).filter(LeaseAndDocument.status == 0).first()
        if doc:
            doc.status = 1
            event_text = f"Portal Upload: {doc.institution.name} submitted {doc.document_type}"
            db.add(AuditLog(timestamp=format_timestamp(), actor="Institution Portal", event_description=event_text))
            db.commit()
            record_live_event(event_text)
            return {"status": "success", "event": event_text, "version": LIVE_STATE["version"], "record_id": doc.id}

    # sla_tick: escalate an application near SLA to overdue
    overdue_app = db.query(Application).options(joinedload(Application.institution)).filter(Application.current_stage_index == 0).first()
    if overdue_app:
        overdue_app.age_in_days = max(overdue_app.age_in_days + 3, 16)
        event_text = f"Statutory SLA Escalation: {overdue_app.institution.name} ({overdue_app.id}) breached Scrutiny timeline (L2 Alert)"
        db.add(AuditLog(timestamp=format_timestamp(), actor="Statutory Engine", event_description=event_text))
        db.commit()
        record_live_event(event_text)
        return {"status": "success", "event": event_text, "version": LIVE_STATE["version"], "app_id": overdue_app.id}

    event_text = "Statutory background SLA verification cycle completed"
    record_live_event(event_text)
    return {"status": "success", "event": event_text, "version": LIVE_STATE["version"]}

# ----------------- Institutions Endpoints -----------------
@app.get("/api/institutions", response_model=List[schemas.InstitutionResponse])
def get_institutions(
    region: Optional[RegionEnum] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Institution)
    if region:
        query = query.filter(Institution.region == region)
    return query.all()

# =========================================================================
# 1. State Machine Endpoints (/api/applications)
# =========================================================================

@app.get("/api/applications", response_model=List[schemas.ApplicationResponse])
def get_applications(
    region: Optional[str] = Query(None, description="Filter by region (North, South, East, West)"),
    role: Optional[str] = Query(None, description="Filter by user role (Bureau, Committee, South, North, West, East)"),
    db: Session = Depends(get_db)
):
    """
    Return all applications filtered optionally by query params region and role.
    - Bureau: Sees all applications (unless region filter is supplied).
    - Regional (North, South, East, West): Sees applications from that region.
    - Committee (EVC / SAC): Sees applications whose active stage is EVC or SAC/SHC.
    """
    query = db.query(Application).options(joinedload(Application.institution))

    # Apply region filter if specified
    if region and region in ["North", "South", "East", "West"]:
        query = query.join(Institution).filter(Institution.region == region)

    apps = query.all()
    results = []

    for a in apps:
        stages = ROUTE_STAGES.get(a.route_type, [])
        curr_stage = stages[a.current_stage_index] if a.current_stage_index < len(stages) else "Decision"

        # Apply role-based visibility filter
        if role:
            if role == "Bureau":
                pass  # Bureau has visibility over all
            elif role in ["North", "South", "East", "West"]:
                if a.institution.region.value != role:
                    continue
            elif role == "Committee":
                # Committee role only views files in EVC or SAC/SHC stages
                if curr_stage not in ["EVC", "SAC/SHC"]:
                    continue

        results.append(a)

    return results

@app.post("/api/applications", response_model=schemas.ApplicationResponse, status_code=201)
def create_application(
    app_in: schemas.ApplicationCreate,
    db: Session = Depends(get_db)
):
    existing = db.query(Application).filter(Application.id == app_in.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Application already exists")

    app_obj = Application(
        id=app_in.id,
        institution_id=app_in.institution_id,
        route_type=app_in.route_type,
        current_stage_index=app_in.current_stage_index,
        age_in_days=app_in.age_in_days,
        evc_timeline_status=app_in.evc_timeline_status,
    )
    db.add(app_obj)

    log_entry = AuditLog(
        timestamp=format_timestamp(),
        actor="System",
        event_description=f"Application {app_in.id} created for institution {app_in.institution_id}"
    )
    db.add(log_entry)
    db.commit()
    db.refresh(app_obj)
    return app_obj

@app.post("/api/applications/{app_id}/advance", response_model=schemas.ApplicationResponse)
def advance_application(
    app_id: str,
    payload: Optional[schemas.ApplicationAdvanceRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Increment current_stage_index by 1, reset age_in_days to 0, and log the transition to audit_logs.
    If it's the final stage, mark as forwarded to the competent authority for decision.
    """
    actor = payload.actor if payload else "Bureau officer"

    app_obj = db.query(Application).options(joinedload(Application.institution)).filter(Application.id == app_id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found")

    stages = ROUTE_STAGES.get(app_obj.route_type, [])
    if not stages:
        raise HTTPException(status_code=400, detail=f"Unknown route type {app_obj.route_type}")

    if app_obj.current_stage_index < len(stages):
        from_stage = stages[app_obj.current_stage_index]
    else:
        from_stage = "Decision"

    # Advance stage index and reset age
    app_obj.current_stage_index += 1
    app_obj.age_in_days = 0

    if app_obj.current_stage_index < len(stages):
        to_stage = stages[app_obj.current_stage_index]
        event = f"{app_obj.id}: {from_stage} completed → moved to {to_stage}"
    else:
        event = f"{app_obj.id}: {from_stage} completed → forwarded to competent authority for decision"

    # Record in audit trail
    log = AuditLog(
        timestamp=format_timestamp(),
        actor=actor,
        event_description=event
    )
    db.add(log)
    db.commit()
    record_live_event(event)
    db.refresh(app_obj)
    return app_obj

@app.post("/api/applications/{app_id}/revert", response_model=schemas.ApplicationResponse)
def revert_application(
    app_id: str,
    payload: schemas.ApplicationRevertRequest,
    db: Session = Depends(get_db)
):
    """
    Decrease current_stage_index by 1 (minimum 0), accept a JSON payload
    {"reason": "Deficiency / Clarification / Further verification"}, and log the reason in audit_logs.
    """
    app_obj = db.query(Application).options(joinedload(Application.institution)).filter(Application.id == app_id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found")

    stages = ROUTE_STAGES.get(app_obj.route_type, [])
    if not stages:
        raise HTTPException(status_code=400, detail=f"Unknown route type {app_obj.route_type}")

    # Decrease current_stage_index by 1 (minimum 0) and reset age
    app_obj.current_stage_index = max(0, app_obj.current_stage_index - 1)
    app_obj.age_in_days = 0

    curr_stage = stages[app_obj.current_stage_index]
    event = f"{app_obj.id}: returned to {curr_stage} · reason: {payload.reason}"

    # Record in audit trail
    log = AuditLog(
        timestamp=format_timestamp(),
        actor=payload.actor,
        event_description=event
    )
    db.add(log)
    db.commit()
    record_live_event(event)
    db.refresh(app_obj)
    return app_obj

# Backward compatibility alias for /revert
@app.post("/api/applications/{app_id}/return", response_model=schemas.ApplicationResponse)
def return_application_alias(
    app_id: str,
    payload: schemas.ApplicationRevertRequest,
    db: Session = Depends(get_db)
):
    return revert_application(app_id=app_id, payload=payload, db=db)

@app.post("/api/applications/{app_id}/reschedule-evc", response_model=schemas.ApplicationResponse)
def reschedule_evc(
    app_id: str,
    payload: schemas.RescheduleEVCRequest,
    db: Session = Depends(get_db)
):
    """
    Reschedule an EVC inspection timeline status for an application,
    persisting the new days to the database and logging it in audit_logs.
    """
    app_obj = db.query(Application).options(joinedload(Application.institution)).filter(Application.id == app_id).first()
    if not app_obj:
        raise HTTPException(status_code=404, detail=f"Application {app_id} not found")

    old_days = app_obj.evc_timeline_status
    app_obj.evc_timeline_status = payload.evc_days

    event = f"{app_obj.id} ({app_obj.institution.name}): EVC inspection rescheduled from {old_days}d to +{payload.evc_days}d"
    log = AuditLog(
        timestamp=format_timestamp(),
        actor=payload.actor,
        event_description=event
    )
    db.add(log)
    db.commit()
    record_live_event(event)
    db.refresh(app_obj)
    return app_obj

# =========================================================================
# 2. Compliance & Document Endpoints (/api/undertakings & /api/documents)
# =========================================================================


# --- Undertakings ---
@app.get("/api/undertakings", response_model=List[schemas.UndertakingResponse])
def get_undertakings(
    region: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Undertaking).options(joinedload(Undertaking.institution))
    
    target_region = region
    if not target_region and role in ["North", "South", "East", "West"]:
        target_region = role

    if target_region:
        query = query.join(Institution).filter(Institution.region == target_region)
    elif role == "Committee":
        query = query.filter(Undertaking.status < 2)

    return query.all()

@app.post("/api/undertakings/{item_id}/upload", response_model=schemas.UndertakingResponse)
def upload_undertaking(
    item_id: int,
    payload: Optional[schemas.UndertakingUploadRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Increment status from 0 (Pending) to 1 (Submitted) upon institution upload.
    """
    actor = payload.actor if payload else "Institution"

    item = db.query(Undertaking).options(joinedload(Undertaking.institution)).filter(Undertaking.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Undertaking {item_id} not found")

    item.status = 1  # Increment/set status from 0 to 1
    event = f"{item.institution.name}: {item.condition_text} submitted by institution"

    log = AuditLog(
        timestamp=format_timestamp(),
        actor=actor,
        event_description=event
    )
    db.add(log)
    db.commit()
    record_live_event(event)
    db.refresh(item)
    return item

@app.post("/api/undertakings/{item_id}/verify", response_model=schemas.UndertakingResponse)
def verify_undertaking(
    item_id: int,
    payload: Optional[schemas.UndertakingVerifyRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Increment status from 1 (Submitted) to 2 (Verified) upon officer verification.
    """
    actor = payload.actor if payload else "Bureau officer"

    item = db.query(Undertaking).options(joinedload(Undertaking.institution)).filter(Undertaking.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Undertaking {item_id} not found")

    item.status = 2  # Increment/set status from 1 to 2
    event = f"{item.institution.name}: {item.condition_text} verified by officer"

    log = AuditLog(
        timestamp=format_timestamp(),
        actor=actor,
        event_description=event
    )
    db.add(log)
    db.commit()
    record_live_event(event)
    db.refresh(item)
    return item

@app.post("/api/undertakings/{item_id}/action", response_model=schemas.UndertakingResponse)
def action_undertaking(
    item_id: int,
    payload: Optional[schemas.UndertakingActionRequest] = None,
    db: Session = Depends(get_db)
):
    """Step action helper: 0 -> 1 -> 2"""
    item = db.query(Undertaking).filter(Undertaking.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Undertaking not found")
    if item.status == 0:
        return upload_undertaking(item_id, schemas.UndertakingUploadRequest(actor=payload.actor if payload else "Institution"), db)
    else:
        return verify_undertaking(item_id, schemas.UndertakingVerifyRequest(actor=payload.actor if payload else "Bureau officer"), db)

@app.post("/api/undertakings/batch-action")
def batch_action_undertakings(
    payload: schemas.UndertakingBatchActionRequest,
    db: Session = Depends(get_db)
):
    """
    Process multiple undertakings in a single request ('upload' or 'verify').
    """
    processed = 0
    items = db.query(Undertaking).options(joinedload(Undertaking.institution)).filter(Undertaking.id.in_(payload.item_ids)).all()

    for item in items:
        if payload.action_type == "upload" and item.status == 0:
            item.status = 1
            event = f"{item.institution.name}: {item.condition_text} submitted by institution (Batch)"
            db.add(AuditLog(timestamp=format_timestamp(), actor=payload.actor, event_description=event))
            processed += 1
        elif payload.action_type == "verify" and item.status < 2:
            item.status = 2
            event = f"{item.institution.name}: {item.condition_text} verified by officer (Batch)"
            db.add(AuditLog(timestamp=format_timestamp(), actor=payload.actor, event_description=event))
            processed += 1

    if processed > 0:
        db.commit()
        record_live_event(f"Batch processed {processed} undertaking(s)")

    return {"status": "success", "processed_count": processed}

# --- Documents & Leases ---

@app.get("/api/documents", response_model=List[schemas.LeaseAndDocumentResponse])
@app.get("/api/leases-and-documents", response_model=List[schemas.LeaseAndDocumentResponse])
def get_documents(
    region: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(LeaseAndDocument).options(joinedload(LeaseAndDocument.institution))

    target_region = region
    if not target_region and role in ["North", "South", "East", "West"]:
        target_region = role

    if target_region:
        query = query.join(Institution).filter(Institution.region == target_region)
    elif role == "Committee":
        query = query.filter(LeaseAndDocument.status < 2)

    return query.all()

@app.post("/api/documents/{item_id}/upload", response_model=schemas.LeaseAndDocumentResponse)
@app.post("/api/leases-and-documents/{item_id}/upload", response_model=schemas.LeaseAndDocumentResponse)
def upload_document(
    item_id: int,
    payload: Optional[schemas.DocumentUploadRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Increment status from 0 (Pending/Expired) to 1 (Submitted) upon institution upload.
    """
    actor = payload.actor if payload else "Institution"

    item = db.query(LeaseAndDocument).options(joinedload(LeaseAndDocument.institution)).filter(LeaseAndDocument.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Document {item_id} not found")

    item.status = 1  # Increment status from 0 to 1
    event = f"{item.institution.name}: {item.document_type} submitted by institution"

    log = AuditLog(
        timestamp=format_timestamp(),
        actor=actor,
        event_description=event
    )
    db.add(log)
    db.commit()
    record_live_event(event)
    db.refresh(item)
    return item

@app.post("/api/documents/{item_id}/verify", response_model=schemas.LeaseAndDocumentResponse)
@app.post("/api/leases-and-documents/{item_id}/verify", response_model=schemas.LeaseAndDocumentResponse)
def verify_document(
    item_id: int,
    payload: Optional[schemas.DocumentVerifyRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Increment status from 1 (Submitted) to 2 (Renewed) upon officer verification,
    and extend document expiry days to +365.
    """
    actor = payload.actor if payload else "Bureau officer"

    item = db.query(LeaseAndDocument).options(joinedload(LeaseAndDocument.institution)).filter(LeaseAndDocument.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Document {item_id} not found")

    item.status = 2  # Increment status from 1 to 2
    # Set/extend expiry days to +365
    if item.expiry_days < 0:
        item.expiry_days = 365
    else:
        item.expiry_days += 365

    event = f"{item.institution.name}: {item.document_type} verified by officer (renewed +365d)"

    log = AuditLog(
        timestamp=format_timestamp(),
        actor=actor,
        event_description=event
    )
    db.add(log)
    db.commit()
    record_live_event(event)
    db.refresh(item)
    return item

@app.post("/api/documents/{item_id}/action", response_model=schemas.LeaseAndDocumentResponse)
@app.post("/api/leases-and-documents/{item_id}/action", response_model=schemas.LeaseAndDocumentResponse)
def action_document(
    item_id: int,
    payload: Optional[schemas.LeaseAndDocumentActionRequest] = None,
    db: Session = Depends(get_db)
):
    """Step action helper: 0 -> 1 -> 2"""
    item = db.query(LeaseAndDocument).filter(LeaseAndDocument.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Document not found")
    if item.status == 0:
        return upload_document(item_id, schemas.DocumentUploadRequest(actor=payload.actor if payload else "Institution"), db)
    else:
        return verify_document(item_id, schemas.DocumentVerifyRequest(actor=payload.actor if payload else "Bureau officer"), db)

# =========================================================================
# 3. Alert Sweep & Audit Endpoint (/api/triggers/alert-sweep & /api/audit-logs)
# =========================================================================

@app.post("/api/triggers/alert-sweep", response_model=schemas.AlertSweepResponse)
@app.post("/api/alert-sweep", response_model=schemas.AlertSweepResponse)
def run_alert_sweep(
    payload: Optional[schemas.SweepRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Scans all items where days <= 15:
    - Generates formatted log entries for L1, L2, or L3 escalations based on overdue thresholds.
    - Saves generated logs to audit_logs.
    - Returns the generated alerts array.
    """
    actor = payload.actor if payload else "System / Automated Sweep"

    apps = db.query(Application).options(joinedload(Application.institution)).all()
    undertakings = db.query(Undertaking).options(joinedload(Undertaking.institution)).filter(Undertaking.status < 2).all()
    documents = db.query(LeaseAndDocument).options(joinedload(LeaseAndDocument.institution)).filter(LeaseAndDocument.status < 2).all()

    generated_alerts: List[schemas.AlertItem] = []

    # 1. Scan Application Stage SLAs
    for a in apps:
        stages = ROUTE_STAGES.get(a.route_type, [])
        if a.current_stage_index < len(stages):
            st = stages[a.current_stage_index]
            sla = STAGE_SLA.get(st, 15)
            days_left = sla - a.age_in_days

            if days_left <= 15:
                lvl = calculate_escalation_level(days_left)
                log_entry = f"{lvl} sent: Stage: {st} ({days_left}d left) · {a.institution.name}"
                
                alert_item = schemas.AlertItem(
                    level=lvl,
                    category="Application Stage",
                    item=f"Stage: {st}",
                    institution=a.institution.name,
                    region=a.institution.region.value,
                    days=days_left,
                    log=log_entry
                )
                generated_alerts.append(alert_item)

                # Persist to audit_logs
                db.add(AuditLog(
                    timestamp=format_timestamp(),
                    actor=actor,
                    event_description=log_entry
                ))

            # Also check EVC scheduling if currently in EVC stage
            if st == "EVC" and a.evc_timeline_status <= 15:
                lvl = calculate_escalation_level(a.evc_timeline_status)
                log_entry = f"{lvl} sent: EVC visit ({a.evc_timeline_status}d left) · {a.institution.name}"
                
                alert_item = schemas.AlertItem(
                    level=lvl,
                    category="EVC Inspection",
                    item="EVC visit",
                    institution=a.institution.name,
                    region=a.institution.region.value,
                    days=a.evc_timeline_status,
                    log=log_entry
                )
                generated_alerts.append(alert_item)

                db.add(AuditLog(
                    timestamp=format_timestamp(),
                    actor=actor,
                    event_description=log_entry
                ))

    # 2. Scan Undertakings
    for u in undertakings:
        if u.due_days <= 15:
            lvl = calculate_escalation_level(u.due_days)
            log_entry = f"{lvl} sent: Undertaking: {u.condition_text} ({u.due_days}d left) · {u.institution.name}"
            
            alert_item = schemas.AlertItem(
                level=lvl,
                category="Undertaking",
                item=u.condition_text,
                institution=u.institution.name,
                region=u.institution.region.value,
                days=u.due_days,
                log=log_entry
            )
            generated_alerts.append(alert_item)

            db.add(AuditLog(
                timestamp=format_timestamp(),
                actor=actor,
                event_description=log_entry
            ))

    # 3. Scan Leases & Documents
    for d in documents:
        if d.expiry_days <= 15:
            lvl = calculate_escalation_level(d.expiry_days)
            log_entry = f"{lvl} sent: Document: {d.document_type} ({d.expiry_days}d left) · {d.institution.name}"
            
            alert_item = schemas.AlertItem(
                level=lvl,
                category="Lease / Document",
                item=d.document_type,
                institution=d.institution.name,
                region=d.institution.region.value,
                days=d.expiry_days,
                log=log_entry
            )
            generated_alerts.append(alert_item)

            db.add(AuditLog(
                timestamp=format_timestamp(),
                actor=actor,
                event_description=log_entry
            ))

    if not generated_alerts:
        db.add(AuditLog(
            timestamp=format_timestamp(),
            actor=actor,
            event_description="Sweep: no pending alerts"
        ))

    db.commit()

    return schemas.AlertSweepResponse(
        status="success",
        alerts_count=len(generated_alerts),
        alerts=generated_alerts
    )

@app.get("/api/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    """
    Return all audit logs sorted by id descending.
    """
    return db.query(AuditLog).order_by(AuditLog.id.desc()).all()

# ----------------- Overview Metrics -----------------
@app.get("/api/overview-metrics", response_model=schemas.OverviewMetricsResponse)
def get_overview_metrics(
    region: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    target_region = region
    if not target_region and role in ["North", "South", "East", "West"]:
        target_region = role

    apps_query = db.query(Application).options(joinedload(Application.institution))
    if target_region:
        apps_query = apps_query.join(Institution).filter(Institution.region == target_region)
    apps = apps_query.all()

    open_apps = 0
    stage_overdue = 0
    evcs_due_soon = 0

    for a in apps:
        stages = ROUTE_STAGES.get(a.route_type, [])
        curr_stage = stages[a.current_stage_index] if a.current_stage_index < len(stages) else "Decision"

        if role == "Committee" and curr_stage not in ["EVC", "SAC/SHC"]:
            continue

        open_apps += 1

        if a.current_stage_index < len(stages):
            st = stages[a.current_stage_index]
            days_left = STAGE_SLA.get(st, 15) - a.age_in_days
            if days_left < 0:
                stage_overdue += 1
            if st == "EVC" and a.evc_timeline_status <= 15:
                evcs_due_soon += 1

    u_query = db.query(Undertaking).filter(Undertaking.status < 2, Undertaking.due_days <= 15)
    d_query = db.query(LeaseAndDocument).filter(LeaseAndDocument.status < 2, LeaseAndDocument.expiry_days <= 15)

    if target_region:
        u_query = u_query.join(Institution).filter(Institution.region == target_region)
        d_query = d_query.join(Institution).filter(Institution.region == target_region)

    undertakings_at_risk = u_query.count()
    documents_expiring = d_query.count()

    return schemas.OverviewMetricsResponse(
        open_applications=open_apps,
        stage_overdue=stage_overdue,
        evcs_due_soon=evcs_due_soon,
        undertakings_at_risk=undertakings_at_risk,
        documents_expiring=documents_expiring
    )

# ----------------- Re-Seed Endpoint -----------------
@app.post("/api/seed")
def seed_data(force: bool = True, db: Session = Depends(get_db)):
    seed_database(db, force=force)
    return {"message": "Database successfully seeded with AICTE mock data"}

# =========================================================================
# 4. Configurable APH Rules & Dynamic SLAs
# =========================================================================

@app.get("/api/config/aph-rules", response_model=schemas.AphRulesConfig)
def get_aph_rules(db: Session = Depends(get_db)):
    """
    Returns current APH processing SLA rules for Scrutiny, EVC, and SAC/SHC stages.
    """
    configs = db.query(SystemConfig).filter(SystemConfig.key.like("sla_%")).all()
    for cfg in configs:
        stage_name = cfg.key.replace("sla_", "")
        try:
            STAGE_SLA[stage_name] = int(cfg.value)
        except ValueError:
            pass

    return {
        "Scrutiny": STAGE_SLA.get("Scrutiny", 15),
        "EVC": STAGE_SLA.get("EVC", 30),
        "SAC/SHC": STAGE_SLA.get("SAC/SHC", 20),
    }

@app.post("/api/config/aph-rules", response_model=schemas.AphRulesConfig)
@app.put("/api/config/aph-rules", response_model=schemas.AphRulesConfig)
def update_aph_rules(payload: schemas.AphRulesUpdateRequest, db: Session = Depends(get_db)):
    """
    Adjust SLA processing days dynamically and save them to backend system_configs table.
    """
    STAGE_SLA["Scrutiny"] = payload.Scrutiny
    STAGE_SLA["EVC"] = payload.EVC
    STAGE_SLA["SAC/SHC"] = payload.SAC_SHC

    sla_map = {
        "sla_Scrutiny": str(payload.Scrutiny),
        "sla_EVC": str(payload.EVC),
        "sla_SAC/SHC": str(payload.SAC_SHC),
    }

    for k, v in sla_map.items():
        cfg = db.query(SystemConfig).filter(SystemConfig.key == k).first()
        if cfg:
            cfg.value = v
        else:
            db.add(SystemConfig(key=k, value=v, description=f"APH SLA days for {k}"))

    # Log to audit trail
    log_entry = (
        f"APH SLA processing rules updated by {payload.actor}: "
        f"Scrutiny={payload.Scrutiny}d, EVC={payload.EVC}d, SAC/SHC={payload.SAC_SHC}d"
    )
    db.add(AuditLog(
        timestamp=format_timestamp(),
        actor=payload.actor,
        event_description=log_entry
    ))

    db.commit()

    return {
        "Scrutiny": STAGE_SLA["Scrutiny"],
        "EVC": STAGE_SLA["EVC"],
        "SAC/SHC": STAGE_SLA["SAC/SHC"],
    }

# =========================================================================
# 5. Export Regional Pendency Report (CSV)
# =========================================================================

@app.get("/api/reports/pendency-csv")
def export_pendency_report(
    region: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Generate and stream a CSV summary report of regional pendencies and overdue metrics.
    """
    target_region = region
    if not target_region and role in ["North", "South", "East", "West"]:
        target_region = role

    query = db.query(Application).options(joinedload(Application.institution))
    if target_region:
        query = query.join(Institution).filter(Institution.region == target_region)
    apps = query.all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Write CSV Header
    writer.writerow([
        "Application ID",
        "Institution ID",
        "Institution Name",
        "Region",
        "Route Type",
        "Current Stage",
        "Days in Stage",
        "Stage SLA (Days)",
        "Days Remaining",
        "Overdue Status",
        "Escalation Level",
        "EVC Due (Days)",
        "Active Undertakings",
        "Expiring Documents"
    ])

    for a in apps:
        stages = ROUTE_STAGES.get(a.route_type, [])
        curr_stage = stages[a.current_stage_index] if a.current_stage_index < len(stages) else "Decision"

        sla = STAGE_SLA.get(curr_stage, 15)
        days_left = sla - a.age_in_days
        overdue_str = "Overdue" if days_left < 0 else "On Track"
        level_str = calculate_escalation_level(days_left)

        u_count = db.query(Undertaking).filter(Undertaking.institution_id == a.institution_id, Undertaking.status < 2).count()
        d_count = db.query(LeaseAndDocument).filter(LeaseAndDocument.institution_id == a.institution_id, LeaseAndDocument.status < 2).count()

        writer.writerow([
            a.id,
            a.institution_id,
            a.institution.name if a.institution else "Unknown",
            a.institution.region.value if a.institution else "Unknown",
            a.route_type,
            curr_stage,
            a.age_in_days,
            sla,
            days_left,
            overdue_str,
            level_str,
            a.evc_timeline_status if curr_stage == "EVC" else "N/A",
            u_count,
            d_count
        ])

    output.seek(0)
    filename = f"AICTE_Regional_Pendency_Report_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ----------------- Applicant & Authentication Endpoints -----------------
@app.post("/api/auth/register", response_model=schemas.AuthSuccessResponse, status_code=201)
@app.post("/api/applicants/register", response_model=schemas.AuthSuccessResponse, status_code=201)
def register_applicant(payload: schemas.ApplicantRegisterRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    existing = db.query(Applicant).filter(Applicant.email == clean_email).first()
    if existing:
        raise HTTPException(status_code=400, detail="An applicant with this email is already registered.")

    # Check if institution already exists by name or generate a new ID
    clean_inst_name = payload.institution_name.strip()
    inst = db.query(Institution).filter(Institution.name.ilike(clean_inst_name)).first()

    if not inst:
        inst_count = db.query(Institution).count()
        inst_id = f"INST-{2630 + inst_count + 1}"
        inst = Institution(id=inst_id, name=clean_inst_name, region=payload.region)
        db.add(inst)
        db.flush()

    # Ensure application exists for this institution
    app_record = db.query(Application).filter(Application.institution_id == inst.id).first()
    if not app_record:
        app_id = f"A-{inst.id.replace('INST-', '')}"
        app_record = Application(
            id=app_id,
            institution_id=inst.id,
            route_type=payload.route_type or "SES",
            current_stage_index=0,
            age_in_days=1,
            evc_timeline_status=0
        )
        db.add(app_record)
        db.flush()

        # Add initial compliance undertaking
        initial_undertaking = Undertaking(
            institution_id=inst.id,
            condition_text="Mandatory AICTE Regulatory Compliance & Accreditation Affidavit",
            due_days=15,
            status=0
        )
        db.add(initial_undertaking)
    else:
        app_id = app_record.id

    now_str = format_timestamp()
    new_applicant = Applicant(
        name=payload.name.strip(),
        email=clean_email,
        password_hash=hash_password(payload.password),
        phone=payload.phone.strip() if payload.phone else None,
        institution_name=inst.name,
        institution_id=inst.id,
        region=payload.region,
        route_type=payload.route_type or "SES",
        role=payload.role or "Institution",
        application_id=app_id,
        created_at=now_str
    )
    db.add(new_applicant)
    db.flush()

    # Add audit log
    audit = AuditLog(
        timestamp=now_str,
        actor=new_applicant.name,
        event_description=f"New Applicant Registered: {new_applicant.name} ({inst.name}, Region: {payload.region.value}, Route: {payload.route_type})"
    )
    db.add(audit)
    record_live_event(f"New applicant registered: {inst.name} ({payload.region.value})")

    db.commit()
    db.refresh(new_applicant)

    token = f"aicte_token_{new_applicant.id}_{int(datetime.now().timestamp())}"
    return schemas.AuthSuccessResponse(
        status="success",
        message="Registration successful. Welcome to AICTE Approval Monitor.",
        token=token,
        applicant=schemas.ApplicantResponse.model_validate(new_applicant)
    )


@app.post("/api/auth/login", response_model=schemas.AuthSuccessResponse)
@app.post("/api/applicants/login", response_model=schemas.AuthSuccessResponse)
def login_applicant(payload: schemas.ApplicantLoginRequest, db: Session = Depends(get_db)):
    clean_email = payload.email.lower().strip()
    applicant = db.query(Applicant).filter(Applicant.email == clean_email).first()

    if applicant:
        if not verify_password(payload.password, applicant.password_hash):
            raise HTTPException(status_code=401, detail="Invalid password. Please check your credentials.")

        now_str = format_timestamp()
        db.add(AuditLog(
            timestamp=now_str,
            actor=applicant.name,
            event_description=f"Applicant signed in: {applicant.name} ({applicant.institution_name})"
        ))
        db.commit()

        token = f"aicte_token_{applicant.id}_{int(datetime.now().timestamp())}"
        return schemas.AuthSuccessResponse(
            status="success",
            message=f"Welcome back, {applicant.name}!",
            token=token,
            applicant=schemas.ApplicantResponse.model_validate(applicant)
        )

    # Demo persona accounts fallback for seamless evaluator testing
    demo_personas = {
        "bureau@aicte.gov.in": {"name": "Central Bureau Officer", "role": "Bureau", "region": RegionEnum.North, "inst": "AICTE Central Bureau"},
        "north@aicte.gov.in": {"name": "Regional Officer (North)", "role": "North", "region": RegionEnum.North, "inst": "Northern Regional Office"},
        "south@aicte.gov.in": {"name": "Regional Officer (South)", "role": "South", "region": RegionEnum.South, "inst": "Southern Regional Office"},
        "west@aicte.gov.in": {"name": "Regional Officer (West)", "role": "West", "region": RegionEnum.West, "inst": "Western Regional Office"},
        "east@aicte.gov.in": {"name": "Regional Officer (East)", "role": "East", "region": RegionEnum.East, "inst": "Eastern Regional Office"},
        "committee@aicte.gov.in": {"name": "Expert Committee Lead", "role": "Committee", "region": RegionEnum.North, "inst": "EVC & SAC Panel"},
    }

    if clean_email in demo_personas:
        meta = demo_personas[clean_email]
        now_str = format_timestamp()
        demo_app = Applicant(
            id=9900 + list(demo_personas.keys()).index(clean_email),
            name=meta["name"],
            email=clean_email,
            password_hash=hash_password(payload.password),
            phone="+91 11 2958 1000",
            institution_name=meta["inst"],
            region=meta["region"],
            route_type="SES",
            role=meta["role"],
            created_at=now_str
        )
        token = f"aicte_demo_token_{int(datetime.now().timestamp())}"
        return schemas.AuthSuccessResponse(
            status="success",
            message=f"Signed in as {meta['name']} (Regulatory Persona)",
            token=token,
            applicant=schemas.ApplicantResponse.model_validate(demo_app)
        )

    raise HTTPException(status_code=401, detail="Invalid email or password. Please check your credentials or register as a new applicant.")


@app.get("/api/applicants", response_model=List[schemas.ApplicantResponse])
def get_applicants(
    region: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Applicant)
    if region and region in RegionEnum.__members__:
        query = query.filter(Applicant.region == region)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            (Applicant.name.ilike(s)) |
            (Applicant.email.ilike(s)) |
            (Applicant.institution_name.ilike(s))
        )
    return query.order_by(Applicant.id.desc()).all()


@app.get("/api/auth/me", response_model=schemas.ApplicantResponse)
@app.get("/api/applicants/me", response_model=schemas.ApplicantResponse)
def get_current_applicant(
    email: Optional[str] = Query(None, description="Email of applicant to fetch"),
    db: Session = Depends(get_db)
):
    if not email:
        first = db.query(Applicant).order_by(Applicant.id.desc()).first()
        if not first:
            raise HTTPException(status_code=404, detail="No registered applicants found.")
        return first

    app_user = db.query(Applicant).filter(Applicant.email == email.lower().strip()).first()
    if not app_user:
        raise HTTPException(status_code=404, detail="Applicant not found.")
    return app_user


