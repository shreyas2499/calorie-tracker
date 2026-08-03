"""Application configuration loaded from environment variables."""
import os

from dotenv import load_dotenv

load_dotenv()


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or invalid."""


def normalize_database_url(url: str) -> str:
    """Railway/Heroku hand out ``postgres://`` URLs; SQLAlchemy needs ``postgresql://``."""
    if url.startswith("postgres://"):
        return "postgresql://" + url[len("postgres://") :]
    return url


def parse_cors_origins(raw: str) -> list[str]:
    """Accept a comma separated list of origins."""
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


class BaseConfig:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True, "pool_recycle": 300}
    JSON_SORT_KEYS = False


class DevelopmentConfig(BaseConfig):
    DEBUG = True


class ProductionConfig(BaseConfig):
    DEBUG = False


class TestingConfig(BaseConfig):
    TESTING = True
    DEBUG = False


_CONFIGS = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}


def build_config(overrides: dict | None = None) -> type[BaseConfig]:
    """Resolve the config class and validate required environment variables."""
    env = (overrides or {}).get("ENV") or os.environ.get("FLASK_ENV", "development")
    config_class = _CONFIGS.get(env, DevelopmentConfig)

    class Resolved(config_class):  # type: ignore[valid-type,misc]
        pass

    overrides = overrides or {}
    testing = env == "testing" or overrides.get("TESTING")

    database_url = overrides.get("SQLALCHEMY_DATABASE_URI") or os.environ.get("DATABASE_URL")
    if not database_url:
        if testing:
            database_url = "sqlite:///:memory:"
        else:
            raise ConfigError(
                "DATABASE_URL is not set. Set it to your PostgreSQL connection string "
                "(Railway provides one on the Postgres service under Variables)."
            )
    Resolved.SQLALCHEMY_DATABASE_URI = normalize_database_url(database_url)

    secret_key = overrides.get("SECRET_KEY") or os.environ.get("SECRET_KEY")
    if not secret_key:
        if env == "production":
            raise ConfigError("SECRET_KEY is required when FLASK_ENV=production.")
        secret_key = "dev-secret-key-change-me"
    Resolved.SECRET_KEY = secret_key

    Resolved.ENV_NAME = env
    Resolved.CORS_ORIGINS = parse_cors_origins(
        overrides.get("CORS_ORIGINS") or os.environ.get("CORS_ORIGINS", "http://localhost:3000")
    )
    return Resolved
