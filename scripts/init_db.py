"""Bring the database schema up to date. Run after starting Postgres:

    docker compose up -d
    uv run python -m scripts.init_db

Same thing as `uv run alembic upgrade head` — kept because it's the command
the README has always given, and it needs no knowledge of Alembic.
"""
from app.core import db

if __name__ == "__main__":
    db.run_migrations()
    print("Database is up to date.")
