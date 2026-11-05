import re

from pydantic import BaseModel, Field, field_validator

from app.models.user import EMAIL_MAX_LENGTH, AuthProvider, Plan

PASSWORD_MIN_LENGTH = 8
# argon2 handles any length, but an unbounded password is free CPU for an attacker.
PASSWORD_MAX_LENGTH = 128

# Deliberately loose: one @, no spaces, a dot in the domain. Real validation
# of an address is sending mail to it, which this flow doesn't do (ADR 0010).
_EMAIL_SHAPE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class EmailAuthRequest(BaseModel):
    email: str = Field(max_length=EMAIL_MAX_LENGTH)
    password: str = Field(min_length=PASSWORD_MIN_LENGTH, max_length=PASSWORD_MAX_LENGTH)

    @field_validator("email")
    @classmethod
    def email_shape(cls, value: str) -> str:
        value = value.strip()
        if not _EMAIL_SHAPE.match(value):
            raise ValueError("Check the email format")
        return value


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
