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
    # Next reset for daily plans (midnight UTC); null for the free plan,
    # whose allowance never resets.
    resets_at: datetime | None
