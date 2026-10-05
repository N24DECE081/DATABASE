"""Run project-owned SQL with DELIMITER support; never interpolate user values."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def statements(text):
    delimiter, buffer = ";", []
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.upper().startswith("DELIMITER "):
            delimiter = stripped.split(maxsplit=1)[1]
            continue
        if not stripped or stripped.startswith("--"):
            continue
        buffer.append(line)
        if stripped.endswith(delimiter):
            value = "\n".join(buffer).rstrip()[:-len(delimiter)].strip()
            if value:
                yield value
            buffer = []
    if buffer:
        raise ValueError("Unterminated SQL statement")


def schema_files():
    return [ROOT / "database/migrations/001_initial_schema.sql",
            ROOT / "database/indexes/001_workflow_indexes.sql"] + sorted((ROOT / "database/triggers").rglob("*.sql")) + sorted((ROOT / "database/views").rglob("*.sql"))


def install(connection):
    for path in schema_files():
        with connection.cursor() as cursor:
            for sql in statements(path.read_text(encoding="utf-8")):
                cursor.execute(sql)
        print("Applied", path.relative_to(ROOT).as_posix())
