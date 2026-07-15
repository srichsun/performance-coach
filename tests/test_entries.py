"""Journal entry storage tests, run against an in-memory SQLite database
so they need no Postgres server and spend no time on I/O."""
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import db, entries
from app.models import Base


@pytest.fixture
def sqlite_db(monkeypatch):
    # One shared in-memory connection so the created tables stick around.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    monkeypatch.setattr(db, "engine", engine)
    monkeypatch.setattr(
        db, "SessionLocal", sessionmaker(bind=engine, expire_on_commit=False)
    )
    return engine


def test_save_and_read_back(sqlite_db):
    new_id = entries.save_entry(
        "I ran 5k today", "That's a real win!", mood="proud", wins="ran 5k"
    )
    assert isinstance(new_id, int)

    todays = entries.entries_on(datetime.now(timezone.utc).date())
    assert len(todays) == 1
    assert todays[0].transcript == "I ran 5k today"
    assert todays[0].mood == "proud"


def test_recent_wins_only_returns_entries_with_wins(sqlite_db):
    entries.save_entry("nothing much happened", "that's okay", wins=None)
    entries.save_entry("finished the report", "great job", wins="finished report")

    wins = entries.recent_wins()
    assert len(wins) == 1
    assert wins[0].wins == "finished report"
