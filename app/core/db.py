"""Database connection setup (SQLAlchemy).

The engine points at the local Postgres from docker-compose by default.
Tests swap in an in-memory SQLite engine, so they need no running server.
"""
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from alembic import command
from alembic.config import Config
from app.core import config

engine = create_engine(config.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

# app/core/db.py -> the project root, where alembic.ini and migrations/ live.
_ROOT = Path(__file__).resolve().parents[2]


def run_migrations() -> None:
    """Bring the database up to the latest migration.

    Alembic, not create_all: create_all only ever adds missing tables, so it
    silently ignores a column that changed. Migrations are ordered, recorded in
    the database, and reversible.
    """
    cfg = Config(str(_ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(_ROOT / "migrations"))
    # Leave the running app's logging alone; alembic.ini's config is for the CLI.
    cfg.attributes["configure_logger"] = False
    command.upgrade(cfg, "head")


def get_session() -> Session:
    """Open a new database session. Caller closes it (use `with`)."""
    return SessionLocal()
