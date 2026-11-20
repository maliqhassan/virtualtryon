"""Try-on credits per plan: the one place these numbers live.

One credit is one try-on. Free accounts get FREE_CREDITS once (they never
renew). Weekly ($3.99) renews every Monday 00:00 UTC; Monthly ($19.99) on
the 1st, 00:00 UTC. Prices are shown by the app's plans screen and aren't
enforced here: payment isn't integrated yet, so a user's plan only changes
server-side. Once purchases exist, renewal follows the purchase date.
"""

from dataclasses import dataclass
from enum import StrEnum

from app.models.user import Plan


class AllowancePeriod(StrEnum):
    LIFETIME = "lifetime"
    WEEK = "week"
    MONTH = "month"


@dataclass(frozen=True)
class PlanAllowance:
    limit: int
    period: AllowancePeriod


FREE_CREDITS = 5

PLAN_ALLOWANCES: dict[Plan, PlanAllowance] = {
    Plan.FREE: PlanAllowance(limit=FREE_CREDITS, period=AllowancePeriod.LIFETIME),
    Plan.WEEKLY: PlanAllowance(limit=20, period=AllowancePeriod.WEEK),
    Plan.MONTHLY: PlanAllowance(limit=100, period=AllowancePeriod.MONTH),
}


def get_allowance(plan: Plan) -> PlanAllowance:
    return PLAN_ALLOWANCES[plan]
