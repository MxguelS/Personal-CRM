from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Event

import pytest
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import Session

from app.db import get_db
from app.main import app
from app.models import Contact, Interaction


def contact(client, **fields):
    response = client.post("/api/contacts", json={"first_name": "Ada", **fields})
    assert response.status_code == 201, response.text
    return response.json()


def interaction(client, contact_id, kind="call", at="2026-01-01T12:00:00Z"):
    response = client.post(
        f"/api/contacts/{contact_id}/interactions",
        json={
            "type": kind,
            "description": "Discussed the project",
            "occurred_at": at,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_contact_crud_search_pagination_and_cascade(client, test_engine):
    ada = contact(client, last_name="Lovelace", email="ada@example.com", company="Analytical")
    assert ada["last_contacted_at"] is None
    assert ada["status"] == "new"
    assert ada["created_at"] and ada["updated_at"]
    bob = contact(client, first_name="Bob", status="waiting")
    assert bob["last_name"] == ""
    result = client.get("/api/contacts?sort=name&page_size=1&page=2").json()
    assert (result["total"], result["page"], result["page_size"]) == (2, 2, 1)
    assert result["items"][0]["id"] == bob["id"]
    for term in ("ADA LOVELACE", "analytical", "ada@example.com"):
        result = client.get("/api/contacts", params={"search": term, "status": "new"}).json()
        assert [item["id"] for item in result["items"]] == [ada["id"]]
    assert client.get("/api/contacts?search=%25").json()["total"] == 0
    updated = client.patch(
        f"/api/contacts/{ada['id']}", json={"notes": "hello", "status": "contacted"}
    )
    assert updated.status_code == 200
    assert updated.json()["first_name"] == "Ada"
    assert client.patch(f"/api/contacts/{ada['id']}", json={"notes": None}).json()["notes"] is None
    interaction(client, ada["id"])
    response = client.delete(f"/api/contacts/{ada['id']}")
    assert response.status_code == 204 and response.content == b""
    with Session(test_engine) as db:
        assert db.scalars(select(Interaction)).all() == []
    assert client.get(f"/api/contacts/{ada['id']}").status_code == 404


@pytest.mark.parametrize(
    "payload",
    [
        {},
        {"first_name": "  "},
        {"first_name": None},
        {"first_name": "Ada", "status": "invalid"},
        {"first_name": "Ada", "last_contacted_at": "2026-01-01T00:00:00Z"},
        {"first_name": "Ada", "next_follow_up_at": "2026-01-01T00:00:00"},
        {"first_name": "Ada", "last_name": None},
    ],
)
def test_contact_validation(client, payload):
    response = client.post("/api/contacts", json=payload)
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"
    assert response.json()["error"]["details"]


@pytest.mark.parametrize("email", ["not-an-email", "a@b", "a@@example.com", "", "a b@example.com"])
def test_invalid_email_on_create_and_patch(client, email):
    cid = contact(client, email="ada@example.com")["id"]
    responses = [
        client.post("/api/contacts", json={"first_name": "Grace", "email": email}),
        client.patch(f"/api/contacts/{cid}", json={"email": email}),
    ]
    for response in responses:
        assert response.status_code == 422
        assert response.json()["error"]["code"] == "validation_error"
        assert response.json()["error"]["details"][0]["loc"] == ["body", "email"]
    assert client.get(f"/api/contacts/{cid}").json()["email"] == "ada@example.com"
    assert client.get("/api/contacts").json()["total"] == 1


def test_email_update_omission_and_clear(client):
    cid = contact(client, email="ada@example.com")["id"]
    url = f"/api/contacts/{cid}"
    response = client.patch(url, json={"email": "ada+crm@example.org"})
    assert response.status_code == 200
    assert response.json()["email"] == "ada+crm@example.org"
    assert client.patch(url, json={"notes": "Updated"}).json()["email"] == "ada+crm@example.org"
    assert client.patch(url, json={"email": None}).json()["email"] is None
    assert contact(client, email=None)["email"] is None


def test_existing_invalid_email_remains_readable(client, test_engine):
    cid = contact(client)["id"]
    with Session(test_engine) as db:
        db.get(Contact, cid).email = "not-an-email"
        db.commit()
    assert client.get(f"/api/contacts/{cid}").json()["email"] == "not-an-email"
    assert client.get("/api/contacts").status_code == 200
    assert client.patch(f"/api/contacts/{cid}", json={"notes": "Updated"}).status_code == 200


def test_patch_validation_and_missing_resources(client):
    cid = contact(client)["id"]
    for payload in ({"first_name": None}, {"status": None}, {"last_contacted_at": None}):
        assert client.patch(f"/api/contacts/{cid}", json=payload).status_code == 422
    for path in ("/api/contacts/999", "/api/contacts/999/interactions", "/nonexistent"):
        response = client.get(path)
        assert response.status_code == 404
        assert response.json()["error"]["code"] == "not_found"
    for query in ("page=0", "page_size=101", "sort=nope", "status=nope"):
        assert client.get(f"/api/contacts?{query}").status_code == 422
    assert client.get("/api/follow-ups?bucket=nope").status_code == 422
    assert client.patch("/api/interactions/999", json={}).status_code == 404
    assert client.delete("/api/interactions/999").status_code == 404
    assert (
        client.post(
            "/api/contacts/999/interactions",
            json={"type": "note", "description": "test", "occurred_at": "2026-01-01T00:00:00Z"},
        ).status_code
        == 404
    )


def test_interaction_recomputation_and_order(client):
    cid = contact(client)["id"]
    first = interaction(client, cid)
    second = interaction(client, cid, "email", "2026-01-03T12:00:00+02:00")
    note = interaction(client, cid, "note", "2026-01-04T12:00:00Z")

    def last():
        value = client.get(f"/api/contacts/{cid}").json()["last_contacted_at"]
        return datetime.fromisoformat(value) if value else None

    assert last() == datetime(2026, 1, 3, 10, tzinfo=UTC)
    assert [i["id"] for i in client.get(f"/api/contacts/{cid}/interactions").json()] == [
        note["id"],
        second["id"],
        first["id"],
    ]
    assert (
        client.patch(f"/api/interactions/{second['id']}", json={"type": "note"}).status_code == 200
    )
    assert last() == datetime(2026, 1, 1, 12, tzinfo=UTC)
    assert (
        client.patch(
            f"/api/interactions/{first['id']}", json={"occurred_at": "2025-12-01T12:00:00Z"}
        ).status_code
        == 200
    )
    assert last() == datetime(2025, 12, 1, 12, tzinfo=UTC)
    assert (
        client.patch(f"/api/interactions/{note['id']}", json={"type": "meeting"}).status_code == 200
    )
    assert last() == datetime(2026, 1, 4, 12, tzinfo=UTC)
    assert client.delete(f"/api/interactions/{note['id']}").status_code == 204
    assert last() == datetime(2025, 12, 1, 12, tzinfo=UTC)
    assert client.delete(f"/api/interactions/{first['id']}").status_code == 204
    assert last() is None


@pytest.mark.parametrize(
    "field,value",
    [
        ("description", " \n"),
        ("type", "sms"),
        ("occurred_at", "2026-01-01T12:00:00"),
        ("description", None),
        ("type", None),
        ("occurred_at", None),
        ("contact_id", 12),
    ],
)
def test_interaction_validation(client, field, value):
    cid = contact(client)["id"]
    item = interaction(client, cid)
    payload = {"type": "call", "description": "hello", "occurred_at": "2026-01-01T12:00:00Z"}
    payload[field] = value
    assert client.post(f"/api/contacts/{cid}/interactions", json=payload).status_code == 422
    response = client.patch(f"/api/interactions/{item['id']}", json={field: value})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "validation_error"


def test_follow_up_boundaries_dashboard_and_limits(client, monkeypatch):
    today = datetime(2026, 9, 4, tzinfo=UTC)
    monkeypatch.setattr("app.main.utc_today", lambda: today)
    overdue = contact(client, next_follow_up_at=(today - timedelta(microseconds=1)).isoformat())
    start = contact(client, next_follow_up_at=today.isoformat(), status="contacted")
    end = contact(
        client, next_follow_up_at=(today + timedelta(days=1, microseconds=-1)).isoformat()
    )
    upcoming = [
        contact(client, next_follow_up_at=(today + timedelta(days=i)).isoformat(), status="waiting")
        for i in (1, 2, 3, 4, 5, 6, 7, 500)
    ]
    contact(client, status="closed", next_follow_up_at=today.isoformat())
    contact(client, status="closed", next_follow_up_at=(today - timedelta(days=1)).isoformat())
    contact(client, status="closed", next_follow_up_at=(today + timedelta(days=2)).isoformat())
    contact(client)
    for bucket, expected in (
        ("overdue", [overdue]),
        ("today", [start, end]),
        ("upcoming", upcoming),
    ):
        result = client.get("/api/follow-ups", params={"bucket": bucket}).json()
        assert [i["id"] for i in result["items"]] == [i["id"] for i in expected]
        assert result["total"] == len(expected)
    paged = client.get("/api/follow-ups?bucket=upcoming&page=2&page_size=6").json()
    assert len(paged["items"]) == 2 and paged["total"] == 8
    for i in range(8):
        interaction(client, start["id"], "note", (today + timedelta(hours=i)).isoformat())
    dashboard = client.get("/api/dashboard").json()
    assert dashboard["total_contacts"] == 15
    assert dashboard["by_status"] == {"new": 3, "contacted": 1, "waiting": 8, "closed": 3}
    assert dashboard["follow_ups_today"] == 2
    assert dashboard["overdue_follow_ups"] == 1
    assert len(dashboard["recent_interactions"]) == 6
    assert dashboard["recent_interactions"][0]["contact_name"] == "Ada"
    assert [i["id"] for i in dashboard["upcoming_follow_ups"]] == [i["id"] for i in upcoming[:6]]
    sorted_items = client.get("/api/contacts?sort=next_follow_up_at").json()["items"]
    assert sorted_items[-1]["next_follow_up_at"] is None


def test_empty_dashboard_health_and_cors(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    result = client.get("/api/dashboard").json()
    assert result["total_contacts"] == 0 and result["recent_interactions"] == []
    assert result["by_status"] == {"new": 0, "contacted": 0, "waiting": 0, "closed": 0}
    response = client.options(
        "/api/contacts",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert (
        "access-control-allow-origin"
        not in client.get("/api/contacts", headers={"Origin": "https://untrusted.example"}).headers
    )


def test_health_failure_is_structured(client):
    class BrokenSession:
        def execute(self, statement):
            raise OperationalError("SELECT 1", {}, Exception("private credentials"))

    app.dependency_overrides[get_db] = lambda: BrokenSession()
    response = client.get("/api/health")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "database_unavailable"
    assert "private credentials" not in response.text


def test_database_constraints(client, test_engine):
    with test_engine.connect() as db:
        for sql in (
            "INSERT INTO contacts (first_name) VALUES (' ')",
            "INSERT INTO contacts (first_name,status) VALUES ('Ada','invalid')",
            "INSERT INTO interactions (contact_id,type,description,occurred_at) "
            "VALUES (999,'call','hello',now())",
        ):
            with pytest.raises(IntegrityError):
                db.execute(text(sql))
            db.rollback()


def test_interaction_writers_wait_for_parent_lock(client, test_engine):
    cid = contact(client)["id"]
    item = interaction(client, cid)
    started = Event()

    def write():
        started.set()
        return client.patch(f"/api/interactions/{item['id']}", json={"type": "note"})

    with ThreadPoolExecutor(max_workers=1) as executor:
        with Session(test_engine) as db:
            db.scalar(select(Contact).where(Contact.id == cid).with_for_update())
            future = executor.submit(write)
            assert started.wait(5)
            # The request cannot finish while another transaction holds its parent lock.
            from concurrent.futures import TimeoutError

            with pytest.raises(TimeoutError):
                future.result(timeout=0.3)
            db.commit()
        assert future.result(timeout=5).status_code == 200
    assert client.get(f"/api/contacts/{cid}").json()["last_contacted_at"] is None


def test_concurrent_interactions_preserve_maximum(client):
    cid = contact(client)["id"]
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(
            executor.map(
                lambda day: interaction(client, cid, "call", f"2026-01-{day:02d}T12:00:00Z"),
                [4, 1, 8, 2, 6, 3, 7, 5],
            )
        )
    assert len(results) == 8
    value = client.get(f"/api/contacts/{cid}").json()["last_contacted_at"]
    assert datetime.fromisoformat(value) == datetime(2026, 1, 8, 12, tzinfo=UTC)
