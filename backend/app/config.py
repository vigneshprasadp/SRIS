import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    PROJECT_NAME = "Branch Core Operations System"
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./branch_app.db")

settings = Settings()
