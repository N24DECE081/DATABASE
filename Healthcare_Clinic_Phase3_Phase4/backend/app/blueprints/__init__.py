"""Register the functional module blueprints; routes are implemented by owners."""

from importlib import import_module


MODULE_NAMES = (
    "auth", "patients", "doctors", "schedules", "appointments",
    "consultations", "medical_history", "prescriptions", "medications", "admin",
)


def register_blueprints(app):
    """Load each module once through the Flask application factory."""
    for name in MODULE_NAMES:
        app.register_blueprint(import_module(f".{name}", __name__).bp)
