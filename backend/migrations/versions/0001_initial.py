"""Initial contacts and interactions schema."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("first_name", sa.String(200), nullable=False),
        sa.Column("last_name", sa.String(200), nullable=False, server_default=""),
        sa.Column("email", sa.String(320)),
        sa.Column("phone", sa.String(100)),
        sa.Column("company", sa.String(300)),
        sa.Column("job_title", sa.String(300)),
        sa.Column("notes", sa.Text()),
        sa.Column("status", sa.String(20), nullable=False, server_default="new"),
        sa.Column("last_contacted_at", sa.DateTime(timezone=True)),
        sa.Column("next_follow_up_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint("length(trim(first_name)) > 0", name="ck_contacts_first_name"),
        sa.CheckConstraint(
            "status IN ('new','contacted','waiting','closed')", name="ck_contacts_status"
        ),
    )
    op.create_index("ix_contacts_status", "contacts", ["status"])
    op.create_index("ix_contacts_updated_at", "contacts", ["updated_at", "id"])
    op.create_index("ix_contacts_name", "contacts", ["first_name", "last_name", "id"])
    op.create_index("ix_contacts_next_follow_up_at", "contacts", ["next_follow_up_at", "id"])
    op.create_table(
        "interactions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "contact_id",
            sa.Integer(),
            sa.ForeignKey("contacts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()
        ),
        sa.CheckConstraint(
            "type IN ('call','email','meeting','note')", name="ck_interactions_type"
        ),
        sa.CheckConstraint("length(trim(description)) > 0", name="ck_interactions_description"),
    )
    op.create_index(
        "ix_interactions_contact_occurred", "interactions", ["contact_id", "occurred_at", "id"]
    )
    op.create_index("ix_interactions_occurred", "interactions", ["occurred_at", "id"])


def downgrade():
    op.drop_table("interactions")
    op.drop_table("contacts")
