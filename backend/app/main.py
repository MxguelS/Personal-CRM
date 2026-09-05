import json
import logging
import urllib.request
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal

from fastapi import Depends, FastAPI, Query, Request, Response
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException

from app import schemas as s
from app.config import settings
from app.db import get_db
from app.models import Contact, Interaction

app = FastAPI(title="Personal CRM", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)
DB = Annotated[Session, Depends(get_db)]
Page = Annotated[int, Query(ge=1)]
PageSize = Annotated[int, Query(ge=1, le=100)]


def error(status, code, message, details=None):
    body = {"code": code, "message": message}
    if details is not None:
        body["details"] = details
    return JSONResponse(status_code=status, content={"error": body})


@app.exception_handler(HTTPException)
async def http_error(request: Request, exc: HTTPException):
    return error(
        exc.status_code, "not_found" if exc.status_code == 404 else "http_error", exc.detail
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError):
    details = [{k: v for k, v in item.items() if k != "ctx"} for item in exc.errors()]
    return error(422, "validation_error", "Request validation failed", jsonable_encoder(details))


@app.exception_handler(Exception)
async def unexpected_error(request: Request, exc: Exception):
    logging.getLogger(__name__).error("Unhandled request failure", exc_info=exc)
    return error(500, "internal_error", "An internal server error occurred")


def contact_or_404(db, contact_id, lock=False):
    query = select(Contact).where(Contact.id == contact_id)
    if lock:
        query = query.with_for_update()
    contact = db.scalar(query)
    if contact is None:
        raise HTTPException(404, "Contact not found")
    return contact


def paginate(db, query, page, page_size):
    total = db.scalar(select(func.count()).select_from(query.order_by(None).subquery()))
    return {
        "items": db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all(),
        "total": total,
        "page": page,
        "page_size": page_size,
    }


def utc_today():
    return datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)


def follow_up_query(bucket, today):
    tomorrow = today + timedelta(days=1)
    query = select(Contact).where(
        Contact.status != "closed", Contact.next_follow_up_at.is_not(None)
    )
    if bucket == "today":
        query = query.where(
            Contact.next_follow_up_at >= today, Contact.next_follow_up_at < tomorrow
        )
    elif bucket == "overdue":
        query = query.where(Contact.next_follow_up_at < today)
    else:
        query = query.where(Contact.next_follow_up_at >= tomorrow)
    return query.order_by(Contact.next_follow_up_at, Contact.id)


@app.get("/api/health")
def health(db: DB):
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError:
        return error(503, "database_unavailable", "Database is unavailable")
    return {"status": "ok"}


@app.get("/api/contacts", response_model=s.ContactPage)
def list_contacts(
    db: DB,
    page: Page = 1,
    page_size: PageSize = 20,
    search: str = "",
    status: s.Status | Literal[""] = "",
    sort: Literal["name", "updated_at", "next_follow_up_at"] = "updated_at",
):
    query = select(Contact)
    if status:
        query = query.where(Contact.status == status)
    if search.strip():
        term = search.strip()
        query = query.where(
            or_(
                (Contact.first_name + " " + Contact.last_name).icontains(term, autoescape=True),
                Contact.email.icontains(term, autoescape=True),
                Contact.company.icontains(term, autoescape=True),
                Contact.phone.icontains(term, autoescape=True),
            )
        )
    ordering = {
        "name": [func.lower(Contact.first_name), func.lower(Contact.last_name), Contact.id],
        "updated_at": [Contact.updated_at.desc(), Contact.id.desc()],
        "next_follow_up_at": [Contact.next_follow_up_at.asc().nulls_last(), Contact.id],
    }
    return paginate(db, query.order_by(*ordering[sort]), page, page_size)


def notify_waiting_contact(contact):
    if contact.status != "waiting":
        return

    webhook_url = settings.n8n_waiting_contact_webhook_url

    data = json.dumps(
        {
            "id": contact.id,
            "first_name": contact.first_name,
            "last_name": contact.last_name,
            "email": contact.email,
            "phone": contact.phone,
            "company": contact.company,
            "job_title": contact.job_title,
            "status": contact.status,
            "next_follow_up_at": (
                contact.next_follow_up_at.isoformat() if contact.next_follow_up_at else None
            ),
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        webhook_url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        urllib.request.urlopen(request, timeout=3)
    except Exception:
        logging.getLogger(__name__).warning(
            "Could not notify n8n about waiting contact",
            exc_info=True,
        )


@app.post("/api/contacts", response_model=s.ContactOut, status_code=201)
def create_contact(payload: s.ContactCreate, db: DB):
    contact = Contact(**payload.model_dump())
    db.add(contact)
    db.commit()
    db.refresh(contact)

    notify_waiting_contact(contact)

    return contact


@app.get("/api/contacts/{contact_id}", response_model=s.ContactOut)
def get_contact(contact_id: int, db: DB):
    return contact_or_404(db, contact_id)


@app.patch("/api/contacts/{contact_id}", response_model=s.ContactOut)
def patch_contact(contact_id: int, payload: s.ContactPatch, db: DB):
    contact = contact_or_404(db, contact_id, lock=True)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(contact, key, value)
    db.commit()
    db.refresh(contact)
    return contact


@app.delete("/api/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: DB):
    db.delete(contact_or_404(db, contact_id, lock=True))
    db.commit()
    return Response(status_code=204)


def recompute_last_contacted(db, contact):
    db.flush()
    contact.last_contacted_at = db.scalar(
        select(func.max(Interaction.occurred_at)).where(
            Interaction.contact_id == contact.id, Interaction.type.in_(["call", "email", "meeting"])
        )
    )
    contact.updated_at = datetime.now(UTC)


@app.get("/api/contacts/{contact_id}/interactions", response_model=list[s.InteractionOut])
def list_interactions(contact_id: int, db: DB):
    contact_or_404(db, contact_id)
    return db.scalars(
        select(Interaction)
        .where(Interaction.contact_id == contact_id)
        .order_by(Interaction.occurred_at.desc(), Interaction.id.desc())
    ).all()


@app.post(
    "/api/contacts/{contact_id}/interactions", response_model=s.InteractionOut, status_code=201
)
def create_interaction(contact_id: int, payload: s.InteractionCreate, db: DB):
    contact = contact_or_404(db, contact_id, lock=True)
    interaction = Interaction(contact_id=contact_id, **payload.model_dump())
    db.add(interaction)
    recompute_last_contacted(db, contact)
    db.commit()
    db.refresh(interaction)
    return interaction


def locked_interaction(db, interaction_id):
    contact_id = db.scalar(select(Interaction.contact_id).where(Interaction.id == interaction_id))
    if contact_id is None:
        raise HTTPException(404, "Interaction not found")
    contact = contact_or_404(db, contact_id, lock=True)
    # Re-read after taking the parent lock: another writer may have deleted this row.
    interaction = db.get(Interaction, interaction_id)
    if interaction is None:
        raise HTTPException(404, "Interaction not found")
    return contact, interaction


@app.patch("/api/interactions/{interaction_id}", response_model=s.InteractionOut)
def patch_interaction(interaction_id: int, payload: s.InteractionPatch, db: DB):
    contact, interaction = locked_interaction(db, interaction_id)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(interaction, key, value)
    recompute_last_contacted(db, contact)
    db.commit()
    db.refresh(interaction)
    return interaction


@app.delete("/api/interactions/{interaction_id}", status_code=204)
def delete_interaction(interaction_id: int, db: DB):
    contact, interaction = locked_interaction(db, interaction_id)
    db.delete(interaction)
    recompute_last_contacted(db, contact)
    db.commit()
    return Response(status_code=204)


@app.get("/api/follow-ups", response_model=s.ContactPage)
def follow_ups(
    db: DB,
    bucket: Literal["today", "overdue", "upcoming"] = "today",
    page: Page = 1,
    page_size: PageSize = 20,
):
    return paginate(db, follow_up_query(bucket, utc_today()), page, page_size)


@app.get("/api/dashboard", response_model=s.Dashboard)
def dashboard(db: DB):
    today = utc_today()
    counts = dict(db.execute(select(Contact.status, func.count()).group_by(Contact.status)).all())
    recent = db.execute(
        select(Interaction, Contact)
        .join(Contact)
        .order_by(Interaction.occurred_at.desc(), Interaction.id.desc())
        .limit(6)
    ).all()
    return {
        "total_contacts": sum(counts.values()),
        "by_status": {
            status: counts.get(status, 0) for status in ("new", "contacted", "waiting", "closed")
        },
        "follow_ups_today": db.scalar(
            select(func.count()).select_from(
                follow_up_query("today", today).order_by(None).subquery()
            )
        ),
        "overdue_follow_ups": db.scalar(
            select(func.count()).select_from(
                follow_up_query("overdue", today).order_by(None).subquery()
            )
        ),
        "recent_interactions": [
            {
                **s.InteractionOut.model_validate(i).model_dump(),
                "contact_name": f"{c.first_name} {c.last_name}".strip(),
            }
            for i, c in recent
        ],
        "upcoming_follow_ups": db.scalars(follow_up_query("upcoming", today).limit(6)).all(),
    }
