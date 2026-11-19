from pydantic import BaseModel, Field

from app.models.user import AuthProvider, Plan


class GoogleAuthRequest(BaseModel):
    """The Firebase ID token from Google sign-in on the phone (ADR 0012)."""

    # Firebase ID tokens are around 1 KB; the cap only bounds the work.
    id_token: str = Field(min_length=1, max_length=8192)


class AccountResponse(BaseModel):
    """Who the caller is: a guest (email null) or a signed-in account."""

    email: str | None
    auth_provider: AuthProvider
    plan: Plan


class SignInResponse(BaseModel):
    """Both sign-in methods answer with this."""

    token: str
    # True when this call created the account (the app then continues onboarding).
    created: bool
    account: AccountResponse


class AccountDeletionRequest(BaseModel):
    """For a Google account, a Firebase ID token from a Google sign-in made
    just now, to confirm it's really them (ADR 0015). Guests send nothing."""

    id_token: str | None = Field(default=None, min_length=1, max_length=8192)
