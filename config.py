# config.py
import os
from pydantic import BaseSettings
from dotenv import load_dotenv
from typing import Optional, List # Import Optional here

# Load environment variables from .env file if it exists
load_dotenv()

class Settings(BaseSettings):
    """Application settings."""

    # Basic app config
    APP_NAME: str = "Branding Server"
    APP_VERSION: str = "0.1.0"
    APP_DESCRIPTION: str = "A server for managing and delivering brand styling assets"

    # Server configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"

    # Database configuration
    DB_URL: str = os.getenv("DB_URL", "sqlite:////data/branding_server.db")

    # File storage configuration
    # ASSET_DIR will now represent the base name for URL and relative path
    ASSET_DIR: str = os.getenv("ASSET_DIR", "assets")
    UPLOAD_SIZE_LIMIT: int = int(os.getenv("UPLOAD_SIZE_LIMIT", "10485760"))  # 10MB

    # Security settings
    API_KEY_REQUIRED: bool = os.getenv("API_KEY_REQUIRED", "False").lower() == "true"
    API_KEY: str = os.getenv("API_KEY", "")

    # CORS settings
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*") # Keep as string, split in app.py

    # Asset file types
    ALLOWED_IMAGE_TYPES: list = [
        "image/jpeg",
        "image/png",
        "image/svg+xml",
        "image/gif",
        "image/webp"
    ]

    ALLOWED_FONT_TYPES: list = [
        "font/ttf",
        "font/otf",
        "font/woff",
        "font/woff2"
    ]

    # Asset types
    ASSET_TYPES: list = [
        "color",
        "image",
        "dimension",
        "font",
        "spacing",
        "shadow",
        "animation",
        "breakpoint",
        "class",
        "other"
    ]

    # Export formats
    EXPORT_FORMATS: list = [
        "css",
        "scss",
        "json",
        "android",
        "ios",
        "docs" # Added docs as an export format here
    ]

    # Base URL for the API/Assets (useful when running behind a reverse proxy or with a specific domain)
    # Use this for generating full URLs in the frontend/CSS
    BASE_URL: Optional[str] = os.getenv("BASE_URL", None)


    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()

# Determine the absolute path of the assets directory inside the container
# Assuming the working directory is /app, this will be /app/assets
CONTAINER_ASSET_DIR_ABS = os.path.abspath(settings.ASSET_DIR)


# Create asset directory structure (called on import)
def create_asset_directories():
    """Create the necessary directories for assets."""
    directories = [
        CONTAINER_ASSET_DIR_ABS, # /app/assets
        os.path.join(CONTAINER_ASSET_DIR_ABS, "sites"), # /app/assets/sites
        os.path.join(CONTAINER_ASSET_DIR_ABS, "brands"), # /app/assets/brands
        os.path.join(CONTAINER_ASSET_DIR_ABS, "exports"), # /app/assets/exports
        os.path.join(CONTAINER_ASSET_DIR_ABS, "exports", "backups"), # /app/assets/exports/backups
        "/data"  # Ensure the database directory exists
    ]

    for directory in directories:
        os.makedirs(directory, exist_ok=True)

# Create directories on import
create_asset_directories()