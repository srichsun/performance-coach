"""Reading back the questions — today's thread, and the days before it."""
from datetime import date

from fastapi import APIRouter

from app.api.deps import CurrentUid
from app.core import clock
from app.services import questions

router = APIRouter(tags=["questions"])


@router.get("/questions/days")
def question_days(uid: CurrentUid):
    """The days this person asked anything, newest first — the history list."""
    return {"days": [d.isoformat() for d in questions.days_with_questions(uid)]}


@router.get("/questions")
def questions_on_day(uid: CurrentUid, day: str | None = None):
    """One day's questions and answers, oldest first. Defaults to today.

    `sources` are the journal days the search reached into for that answer —
    what was looked at, which is not the same as what the answer leaned on.
    """
    d = date.fromisoformat(day) if day else clock.today()
    rows = questions.questions_on(d, user_id=uid)
    return {
        "day": d.isoformat(),
        "questions": [
            {
                "id": q.id,
                "question": q.question,
                "answer": q.answer,
                "sources": q.sources or [],
                "asked_at": q.created_at.isoformat(),
            }
            for q in rows
        ],
    }
