from datetime import datetime

from pydantic import BaseModel

from app.models.user import Plan
from app.services.plans import AllowancePeriod


class UsageResponse(BaseModel):
    plan: Plan
    period: AllowancePeriod
    limit: int
    used: int
    remaining: int
    # When Weekly/Monthly credits renew (UTC); null for the free credits,
    # which never renew.
    resets_at: datetime | None
    # True while try-on limits are switched off (TRYON_LIMITS_ENABLED=false).
    unlimited: bool = False
