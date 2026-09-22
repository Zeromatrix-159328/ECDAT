import os
from typing import List

class Settings:
    PROJECT_NAME: str = "Enterprise Cryptographic Discovery & Assessment Tool (ECDAT) API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    CORS_ORIGINS: List[str] = ["*"]
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")

settings = Settings()
