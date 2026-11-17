"""Read configuration after dotenv has loaded; tests may override individual keys."""
import os
from datetime import timedelta


def environment_config():
    return {
        "SECRET_KEY": os.environ.get("FLASK_SECRET_KEY"),
        "MYSQL_HOST": os.environ.get("MYSQL_HOST", "127.0.0.1"),
        "MYSQL_PORT": int(os.environ.get("MYSQL_PORT", "3306")),
        "MYSQL_DATABASE": os.environ.get("MYSQL_DATABASE", "healthcare_clinic_portal"),
        "MYSQL_USER": os.environ.get("MYSQL_USER", "healthcare_app"),
        "MYSQL_PASSWORD": os.environ.get("MYSQL_PASSWORD", ""),
        "JAAS_APP_ID": os.environ.get("JAAS_APP_ID", "").strip(),
        "JAAS_API_KEY_ID": os.environ.get("JAAS_API_KEY_ID", "").strip(),
        "JAAS_PRIVATE_KEY": os.environ.get("JAAS_PRIVATE_KEY", ""),
        "JAAS_JOIN_EARLY_MINUTES": int(os.environ.get("JAAS_JOIN_EARLY_MINUTES", "10")),
        "JAAS_JOIN_GRACE_MINUTES": int(os.environ.get("JAAS_JOIN_GRACE_MINUTES", "15")),
        "SESSION_COOKIE_HTTPONLY": True,
        "SESSION_COOKIE_SAMESITE": "Lax",
        "SESSION_COOKIE_SECURE": os.environ.get("COOKIE_SECURE", "0") == "1",
        "PERMANENT_SESSION_LIFETIME": timedelta(minutes=30),
        "MAX_CONTENT_LENGTH": 1024 * 1024,
        "WTF_CSRF_TIME_LIMIT": 3600,
    }
