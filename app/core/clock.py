"""The app's idea of "today".

A journal day should end at midnight where the person lives, not at UTC
midnight (which is 8am in Taiwan — mid-morning, halfway through a thought).
The journal, the question thread and the screen all ask this module what
"today" means, so they can never disagree about where the day ends.
"""
from datetime import date, datetime, timedelta, timezone

# Taiwan time. A fixed offset is enough — Taiwan has no daylight saving.
TZ = timezone(timedelta(hours=8))


def today() -> date:
    """The current journal day."""
    return datetime.now(TZ).date()
