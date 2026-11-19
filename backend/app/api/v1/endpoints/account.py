"""HTTP layer for account-level operations. Logic in app/services/account.py."""

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import AccountDeletionRequest
from app.services.account import (
    ConfirmationRequiredError,
    delete_account,
    delete_all_user_data,
)
from app.services.firebase_identity import (
    IdentityUnavailableError,
    IdentityVerifier,
    get_identity_verifier,
)

router = APIRouter()


@router.delete("/data", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    await delete_all_user_data(db=db, user_id=current_user.id)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    request: AccountDeletionRequest | None = Body(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    verifier: IdentityVerifier = Depends(get_identity_verifier),
) -> None:
    """Deletes the account and everything in it (ADR 0015)."""
    try:
        await delete_account(
            db=db,
            user=current_user,
            id_token=request.id_token if request else None,
            verifier=verifier,
        )
    except ConfirmationRequiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "confirmation_required",
                "message": "Please confirm with Google to delete your account.",
            },
        ) from exc
    except IdentityUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "code": "confirmation_unavailable",
                "message": "We can't check your Google sign-in right now. Please try again.",
            },
        ) from exc
