"""Account-level operations.

"Delete all my data" removes everything personal a user has stored: saved
looks, wardrobe, photos, profile, and every image file behind them. The
account itself stays. Try-on job rows are kept with their image references
cleared: they hold no personal data once redacted, and they're what
usage.py counts, so clearing your data can't be used to get another free
try-on.

"Delete my account" (ADR 0015) removes all of that and the account too:
the user row with its email and Google id, and the try-on history. A
Google account must confirm with a fresh Google sign-in first, so a stolen
session token alone can't delete someone's account.
"""

import logging
import time
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.account_deletion_repository import AccountDeletionRepository
from app.db.repositories.garment_repository import GarmentRepository
from app.db.repositories.profile_repository import ProfileRepository
from app.db.repositories.saved_look_repository import SavedLookRepository
from app.db.repositories.user_photo_repository import UserPhotoRepository, photo_files
from app.db.repositories.user_repository import UserRepository
from app.models.user import User
from app.services.firebase_identity import IdentityVerifier, InvalidIdentityError
from app.services.inference_jobs import stage_redact_tryon_images
from app.services.storage import get_storage_service

logger = logging.getLogger(__name__)

# How recently the person must have signed in with Google to delete their
# account. Long enough for the confirm step, short enough that an old token
# (e.g. a copied one) doesn't work.
CONFIRMATION_MAX_AGE_SECONDS = 5 * 60


class ConfirmationRequiredError(Exception):
    """A Google account must confirm with a fresh Google sign-in first."""


async def _stage_delete_user_data(db: AsyncSession, user_id: UUID) -> list[str]:
    """Stages deleting the user's looks, wardrobe, photos and profile, and
    clears try-on images. Returns every file path to delete after commit."""
    paths: list[str] = []

    looks = SavedLookRepository(db)
    for look in await looks.list_for_user(user_id):
        paths += [
            look.user_image_url,
            look.clothing_image_url,
            look.generated_image_url,
        ]
    await looks.stage_delete_all_for_user(user_id)

    garments = GarmentRepository(db)
    paths += [garment.image_url for garment in await garments.list_for_user(user_id)]
    await garments.stage_delete_all_for_user(user_id)

    photos = UserPhotoRepository(db)
    paths += [path for photo in await photos.list_for_user(user_id) for path in photo_files(photo)]
    await photos.stage_delete_all_for_user(user_id)

    paths += await stage_redact_tryon_images(db, user_id)
    await ProfileRepository(db).stage_delete_for_user(user_id)
    return paths


def _delete_files(paths: list[str]) -> None:
    """After the commit: the deletion has happened, so one file that can't
    be removed is logged and skipped, not allowed to stop the others."""
    storage = get_storage_service()
    for path in paths:
        if not path:
            continue
        try:
            storage.delete(path)
        except Exception:
            logger.exception("couldn't delete a stored file after deleting user data")


async def delete_all_user_data(db: AsyncSession, user_id: UUID) -> None:
    """All database changes go in one transaction; files are deleted only
    after it commits. A failure part-way therefore leaves everything as it
    was (and the user can retry), never rows pointing at deleted files."""
    paths = await _stage_delete_user_data(db, user_id)
    await db.commit()
    _delete_files(paths)
    logger.info("all user data deleted: user_id=%s files=%d", user_id, len(paths))


async def _confirm_google(user: User, id_token: str | None, verifier: IdentityVerifier) -> None:
    """Raises ConfirmationRequiredError unless `id_token` is a Google sign-in
    to this same account from the last few minutes. IdentityUnavailableError
    (the check can't run right now) passes through."""
    if not id_token:
        raise ConfirmationRequiredError
    try:
        identity = await verifier.verify(id_token)
    except InvalidIdentityError as exc:
        raise ConfirmationRequiredError from exc
    signed_in_at = identity.auth_time
    if (
        identity.uid != user.firebase_uid
        or signed_in_at is None
        or time.time() - signed_in_at > CONFIRMATION_MAX_AGE_SECONDS
    ):
        raise ConfirmationRequiredError


async def delete_account(
    db: AsyncSession, user: User, id_token: str | None, verifier: IdentityVerifier
) -> None:
    """Deletes the account and everything in it, in one transaction, then
    its files. Raises ConfirmationRequiredError for a Google account without
    a fresh confirmation."""
    if user.firebase_uid is not None:
        await _confirm_google(user, id_token, verifier)

    # Locked, so a try-on (which locks the same row to check the allowance)
    # can't start while the account is being removed.
    await UserRepository(db).get_for_update(user.id)
    paths = await _stage_delete_user_data(db, user.id)
    await AccountDeletionRepository(db).stage_delete_account(user)
    await db.commit()
    _delete_files(paths)
    # The id only: the email and Google id are gone, and shouldn't outlive
    # the account in the logs either.
    logger.info("account deleted: user_id=%s files=%d", user.id, len(paths))
