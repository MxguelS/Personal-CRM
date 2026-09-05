from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (
        CheckConstraint("length(trim(first_name)) > 0", name="ck_contacts_first_name"),
        CheckConstraint(
            "status IN ('new','contacted','waiting','closed')", name="ck_contacts_status"
        ),
        Index("ix_contacts_status", "status"),
        Index("ix_contacts_updated_at", "updated_at", "id"),
        Index("ix_contacts_name", "first_name", "last_name", "id"),
        Index("ix_contacts_next_follow_up_at", "next_follow_up_at", "id"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(200))
    last_name: Mapped[str] = mapped_column(String(200), server_default="")
    email: Mapped[str | None] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(100))
    company: Mapped[str | None] = mapped_column(String(300))
    job_title: Mapped[str | None] = mapped_column(String(300))
    notes: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), server_default="new")
    last_contacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    next_follow_up_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Interaction(Base):
    __tablename__ = "interactions"
    __table_args__ = (
        CheckConstraint("type IN ('call','email','meeting','note')", name="ck_interactions_type"),
        CheckConstraint("length(trim(description)) > 0", name="ck_interactions_description"),
        Index("ix_interactions_contact_occurred", "contact_id", "occurred_at", "id"),
        Index("ix_interactions_occurred", "occurred_at", "id"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    contact_id: Mapped[int] = mapped_column(ForeignKey("contacts.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String(20))
    description: Mapped[str] = mapped_column(Text)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
