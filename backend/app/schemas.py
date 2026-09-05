from datetime import datetime
from typing import Annotated, Literal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    model_validator,
)

Status = Literal["new", "contacted", "waiting", "closed"]
InteractionType = Literal["call", "email", "meeting", "note"]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ContactCreate(Input):
    first_name: Name
    last_name: str = Field(default="", max_length=200)
    email: EmailStr | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=100)
    company: str | None = Field(default=None, max_length=300)
    job_title: str | None = Field(default=None, max_length=300)
    notes: str | None = None
    status: Status = "new"
    next_follow_up_at: AwareDatetime | None = None


class ContactPatch(ContactCreate):
    first_name: Name | None = None

    @model_validator(mode="after")
    def reject_null_name(self):
        if "first_name" in self.model_fields_set and self.first_name is None:
            raise ValueError("first_name cannot be null")
        return self


class ContactOut(ContactCreate):
    model_config = ConfigDict(from_attributes=True)
    # Existing addresses may predate input validation; keep them readable for correction.
    email: str | None = Field(default=None, max_length=320)
    id: int
    last_contacted_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ContactPage(BaseModel):
    items: list[ContactOut]
    total: int
    page: int
    page_size: int


class InteractionCreate(Input):
    type: InteractionType
    description: Description
    occurred_at: AwareDatetime


class InteractionPatch(Input):
    type: InteractionType | None = None
    description: Description | None = None
    occurred_at: AwareDatetime | None = None

    @model_validator(mode="after")
    def reject_explicit_null(self):
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("Interaction fields cannot be null")
        return self


class InteractionOut(InteractionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    contact_id: int
    created_at: datetime


class RecentInteraction(InteractionOut):
    contact_name: str


class StatusCounts(BaseModel):
    new: int = 0
    contacted: int = 0
    waiting: int = 0
    closed: int = 0


class Dashboard(BaseModel):
    total_contacts: int
    follow_ups_today: int
    overdue_follow_ups: int
    by_status: StatusCounts
    recent_interactions: list[RecentInteraction]
    upcoming_follow_ups: list[ContactOut]
