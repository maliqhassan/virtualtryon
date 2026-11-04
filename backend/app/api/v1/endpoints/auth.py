"""HTTP layer for sign-in. Logic in app/services/auth.py (ADR 0010)."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_existing_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AccountResponse, EmailAuthRequest, EmailAuthResponse
from app.services.auth import TooManyAttemptsError, WrongPasswordError, continue_with_email

router = APIRouter()


def _account(user: User) -> AccountResponse:
    return AccountResponse(email=user.email, auth_provider=user.auth_provider, plan=user.plan)


@router.post("/email", response_model=EmailAuthResponse)
async def email_sign_in(
    payload: EmailAuthRequest,
    request: Request,
    current_user: User | None = Depends(get_existing_user),
    db: AsyncSession = Depends(get_db),
) -> EmailAuthResponse:
    # The client address as Render's proxy reports it (uvicorn --proxy-headers).
    caller_address = request.client.host if request.client else "unknown"
    try:
        result = await continue_with_email(
            db, current_user, payload.email, payload.password, caller_address=caller_address
        )
    except WrongPasswordError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "wrong_password",
                "message": "That password doesn’t match this email.",
            },
        ) from None
    except TooManyAttemptsError:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "too_many_attempts",
                "message": "Too many attempts. Please wait a few minutes and try again.",
            },
        ) from None
    return EmailAuthResponse(
        token=result.token, created=result.created, account=_account(result.user)
    )


@router.get("/me", response_model=AccountResponse)
async def who_am_i(current_user: User = Depends(get_current_user)) -> AccountResponse:
    return _account(current_user)
