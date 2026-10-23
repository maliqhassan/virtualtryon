"""Try-on allowance per plan: the one place these numbers live.

Free users get a fixed number of try-ons in total (not per day). Paid
plans get a daily allowance that resets at midnight UTC. Prices are shown
by the app's upgrade screen; they are not enforced here because payment
isn't integrated yet. A user's plan only changes server-side.
"""

from dataclasses import dataclass
from enum import StrEnum

from app.models.user import Plan


class AllowancePeriod(StrEnum):
    LIFETIME = "lifetime"
    DAY = "day"


@dataclass(frozen=True)
class PlanAllowance:
    limit: int
    period: AllowancePeriod


PLAN_ALLOWANCES: dict[Plan, PlanAllowance] = {
    Plan.FREE: PlanAllowance(limit=1, period=AllowancePeriod.LIFETIME),
    Plan.PRO: PlanAllowance(limit=2, period=AllowancePeriod.DAY),
    Plan.PRO_PLUS: PlanAllowance(limit=3, period=AllowancePeriod.DAY),
}


def get_allowance(plan: Plan) -> PlanAllowance:
    return PLAN_ALLOWANCES[plan]
