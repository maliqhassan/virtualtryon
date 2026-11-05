"""HTTP layer for sign-in. Logic in app/services/auth.py (ADRs 0010, 0012)."""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_existing_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AccountResponse, EmailAuthRequest, GoogleAuthRequest, SignInResponse
from app.services.auth import (
    SignInResult,
    TooManyAttemptsError,
    WrongPasswordError,
    continue_with_email,
    continue_with_google,
)
from app.services.firebase_identity import (
    IdentityUnavailableError,
    IdentityVerifier,
    InvalidIdentityError,
    get_identity_verifier,
)

router = APIRouter()


def _account(user: User) -> AccountResponse:
    return AccountResponse(email=user.email, auth_provider=user.auth_provider, plan=user.plan)


def _response(result: SignInResult) -> SignInResponse:
    return SignInResponse(token=result.token, created=result.created, account=_account(result.user))


def _caller_address(request: Request) -> str:
    # The client address as Render's proxy reports it (uvicorn --proxy-headers).
    return request.client.host if request.client else "unknown"


def _error(status_code: int, code: str, message: str) -> HTTPException:
    """`code` is what the app switches on; `message` is safe to show."""
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


_TOO_MANY_ATTEMPTS = (
    status.HTTP_429_TOO_MANY_REQUESTS,
    "too_many_attempts",
    "Too many attempts. Please wait a few minutes and try again.",
)


@router.post("/email", response_model=SignInResponse)
async def email_sign_in(
    payload: EmailAuthRequest,
    request: Request,
    current_user: User | None = Depends(get_existing_user),
    db: AsyncSession = Depends(get_db),
) -> SignInResponse:
    try:
        result = await continue_with_email(
            db,
            current_user,
            payload.email,
            payload.password,
            caller_address=_caller_address(request),
        )
    except WrongPasswordError:
        raise _error(
            status.HTTP_401_UNAUTHORIZED,
            "wrong_password",
            "That password doesn’t match this email.",
        ) from None
    except TooManyAttemptsError:
        raise _error(*_TOO_MANY_ATTEMPTS) from None
    return _response(result)


@router.post("/google", response_model=SignInResponse)
async def google_sign_in(
    payload: GoogleAuthRequest,
    request: Request,
    current_user: User | None = Depends(get_existing_user),
    db: AsyncSession = Depends(get_db),
    verifier: IdentityVerifier = Depends(get_identity_verifier),
) -> SignInResponse:
    try:
        result = await continue_with_google(
            db,
            current_user,
            payload.id_token,
            verifier,
            caller_address=_caller_address(request),
        )
    except InvalidIdentityError:
        raise _error(
            status.HTTP_401_UNAUTHORIZED,
            "invalid_google_sign_in",
            "Google sign-in didn’t go through. Please try again.",
        ) from None
    except IdentityUnavailableError:
        raise _error(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "google_sign_in_unavailable",
            "Google sign-in isn’t available right now. Please try again later.",
        ) from None
    except TooManyAttemptsError:
        raise _error(*_TOO_MANY_ATTEMPTS) from None
    return _response(result)


@router.get("/me", response_model=AccountResponse)
async def who_am_i(current_user: User = Depends(get_current_user)) -> AccountResponse:
    return _account(current_user)
