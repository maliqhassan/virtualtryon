from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Shared declarative base. All ORM models inherit from this so Alembic's
    autogenerate can discover them via Base.metadata."""
