# SQLAlchemy models are registered here so Alembic's autogenerate can see them.
from app.models.catalog import Product, Store
from app.models.garment import Garment
from app.models.inference_job import InferenceJob, InferenceJobStatus
from app.models.profile import Profile
from app.models.saved_look import SavedLook
from app.models.user import AuthProvider, User
from app.models.user_photo import UserPhoto

__all__ = [
    "AuthProvider",
    "Garment",
    "InferenceJob",
    "InferenceJobStatus",
    "Product",
    "Profile",
    "SavedLook",
    "Store",
    "User",
    "UserPhoto",
]
