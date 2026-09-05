import os
import uuid
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.main import app


@pytest.fixture(scope="session")
def test_engine():
    raw = os.environ.get("TEST_DATABASE_URL")
    if not raw:
        pytest.fail("Set TEST_DATABASE_URL to a separate PostgreSQL database ending in _test")
    url = make_url(raw)
    dev = make_url(settings.database_url)
    if (
        url.drivername != "postgresql+psycopg"
        or not url.database
        or not url.database.endswith("_test")
        or url.database == dev.database
    ):
        pytest.fail("Unsafe TEST_DATABASE_URL: require a distinct PostgreSQL *_test database")
    schema = "test_" + uuid.uuid4().hex
    admin = create_engine(url, connect_args={"connect_timeout": 5})
    # All DDL and cleanup are confined to a new random schema, never existing tables.
    with admin.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    isolated = url.update_query_dict({"options": f"-csearch_path={schema}"})
    engine = create_engine(isolated)
    original = settings.database_url
    try:
        settings.database_url = isolated.render_as_string(hide_password=False)
        config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
        command.upgrade(config, "head")
        command.check(config)
        command.downgrade(config, "base")
        command.upgrade(config, "head")
        yield engine
    finally:
        settings.database_url = original
        engine.dispose()
        with admin.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin.dispose()


@pytest.fixture
def client(test_engine):
    with test_engine.begin() as connection:
        connection.execute(text("TRUNCATE interactions, contacts RESTART IDENTITY"))

    def override_db():
        with Session(test_engine, expire_on_commit=False) as session:
            yield session

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app, raise_server_exceptions=False) as client:
            yield client
    finally:
        app.dependency_overrides.clear()
