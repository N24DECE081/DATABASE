import os

from app import create_app


app = create_app()


if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "true").strip().lower() in ("1", "true", "yes")
    app.run(host="127.0.0.1", port=int(os.environ.get("APP_PORT", "5000")), debug=debug_mode)

