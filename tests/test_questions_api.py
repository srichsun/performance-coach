"""Question-history route tests — today's thread and the days before it."""
import pytest
from fastapi.testclient import TestClient

from app.core import clock
from app.core import security as auth
from app.main import app
from app.services import questions

client = TestClient(app)

UID = "u-questions"


@pytest.fixture(autouse=True)
def signed_in():
    """Set per test rather than at import: the overrides live on the one shared
    app, so a module-level assignment would depend on import order."""
    previous = app.dependency_overrides.get(auth.current_user_uid)
    app.dependency_overrides[auth.current_user_uid] = lambda: UID
    yield
    if previous is None:
        app.dependency_overrides.pop(auth.current_user_uid, None)
    else:
        app.dependency_overrides[auth.current_user_uid] = previous


def test_todays_thread_comes_back_with_its_sources(sqlite_db):
    questions.save("what lifts me?", "mornings", UID, sources=["2026-07-19"])

    body = client.get("/questions").json()

    assert body["day"] == clock.today().isoformat()
    assert body["questions"][0]["question"] == "what lifts me?"
    assert body["questions"][0]["sources"] == ["2026-07-19"]


def test_the_history_list_is_days_not_a_single_thread(sqlite_db):
    questions.save("one", "a", UID)
    questions.save("two", "b", UID)

    assert client.get("/questions/days").json()["days"] == [clock.today().isoformat()]


def test_another_persons_thread_is_not_readable(sqlite_db):
    questions.save("theirs", "answer", "someone-else")

    assert client.get("/questions").json()["questions"] == []
    assert client.get("/questions/days").json()["days"] == []
