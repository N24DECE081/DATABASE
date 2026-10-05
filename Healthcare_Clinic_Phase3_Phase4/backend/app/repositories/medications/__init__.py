"""Formulary catalog; no warehouse/inventory entities."""
from ...db import query
from ...entities import Medication
from ..base import get, insert


def list_medications(search=""):
    return query("SELECT * FROM medication WHERE medication_name LIKE %s ORDER BY medication_name", (f"%{search}%",))
