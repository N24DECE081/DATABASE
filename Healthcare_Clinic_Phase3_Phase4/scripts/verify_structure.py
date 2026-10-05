"""Verify module paths and entity fields against the retained Phase 2 baseline.

Run with Python 3.10+ from any directory. This checks the structure, not MySQL
integrity or application functionality. No third-party dependencies are needed.
"""

import ast
from collections import Counter
from dataclasses import fields
from datetime import date, datetime, time
import hashlib
import json
from pathlib import Path
import re
import runpy
import sys
from typing import Literal, get_args, get_origin
from xml.etree import ElementTree as ET
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {
    "USER_ACCOUNT", "PATIENT", "DOCTOR", "GENERAL_PRACTITIONER",
    "SPECIALIST", "SPECIALTY", "DOCTOR_SCHEDULE", "APPOINTMENT",
    "CONSULTATION_SESSION", "MEDICAL_HISTORY", "MEDICATION",
    "PRESCRIPTION", "PRESCRIPTION_ITEM",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def read_baseline(source):
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    with ZipFile(source) as archive:
        body = ET.fromstring(archive.read("word/document.xml")).find("w:body", namespace)

    def text(node):
        return " ".join(t.text or "" for t in node.findall(".//w:t", namespace)).strip()

    tables = {}
    current = None
    for node in body:
        if node.tag.endswith("p"):
            match = re.match(r"Table 3\.\d+:\s*(\w+)", text(node))
            if match:
                current = match.group(1)
        elif node.tag.endswith("tbl") and current:
            rows = node.findall("w:tr", namespace)
            headers = [text(cell) for cell in rows[0].findall("w:tc", namespace)]
            if headers != ["Attribute Name", "Data Type", "Nullable", "Default", "Constraints & Business Meaning"]:
                continue
            tables[current] = [
                [text(cell) for cell in row.findall("w:tc", namespace)] for row in rows[1:]
            ]
            current = None
    return tables


def main():
    manifest = json.loads((ROOT / "docs/module_manifest.json").read_text(encoding="utf-8"))
    source = ROOT / manifest["baseline"]["path"]
    require(source.is_file(), f"Retained baseline missing: {source}")
    require(hashlib.sha256(source.read_bytes()).hexdigest() == manifest["baseline"]["sha256"],
            "Phase 2 baseline hash differs from the recorded source")
    baseline = read_baseline(source)
    require(set(baseline) == EXPECTED, "Phase 2 must contain exactly the 13 approved relations")
    entities = manifest["entities"]
    overrides = {(o["entity"], o["field"]): o for o in manifest.get("approved_overrides", [])}
    require(Counter(e["logical_name"] for e in entities) == Counter(EXPECTED),
            "Manifest contains missing, extra or duplicate entities")
    assignment = Counter(e for m in manifest["modules"] for e in m["entities"])
    require(assignment == Counter(EXPECTED), "Every entity must have exactly one module owner")
    modules = {m["name"]: m for m in manifest["modules"]}
    require(len(modules) == len(manifest["modules"]), "Duplicate module names")

    for module in modules.values():
        for layer, relative in module["paths"].items():
            path = ROOT / relative
            require(path.exists(), f"Missing {module['name']} {layer}: {relative}")
            if not path.is_file():
                require(any(path.iterdir()), f"Empty untracked directory: {relative}")
        blueprint = ast.parse((ROOT / module["paths"]["blueprint"]).read_text(encoding="utf-8"))
        calls = [n for n in ast.walk(blueprint) if isinstance(n, ast.Call)
                 and isinstance(n.func, ast.Name) and n.func.id == "Blueprint"]
        require(len(calls) == 1, f"Expected one blueprint: {module['name']}")
        require(ast.literal_eval(calls[0].args[0]) == module["name"], "Blueprint name mismatch")
        prefixes = [ast.literal_eval(k.value) for k in calls[0].keywords if k.arg == "url_prefix"]
        require(prefixes == [module["url_prefix"]], f"Blueprint prefix mismatch: {module['name']}")

    registry = ast.parse((ROOT / "backend/app/blueprints/__init__.py").read_text(encoding="utf-8"))
    registered = next(ast.literal_eval(n.value) for n in registry.body
                      if isinstance(n, ast.Assign) and any(
                          isinstance(t, ast.Name) and t.id == "MODULE_NAMES" for t in n.targets))
    require(Counter(registered) == Counter(modules.keys()), "Blueprint registry and module manifest differ")
    count = 0
    for entity in entities:
        relation = entity["logical_name"]
        require(entity["module"] in modules and relation in modules[entity["module"]]["entities"],
                f"Entity module mismatch: {relation}")
        recorded = [[c["logical_name"], c["sql_type"], "Yes" if c["nullable"] else "No",
                     c["default"], c["constraints"]] for c in entity["columns"]]
        require(recorded == baseline[relation], f"Baseline dictionary mismatch: {relation}")
        cls = runpy.run_path(str(ROOT / entity["path"]))[entity["class_name"]]
        require(cls.table_name == entity["table"] == relation.lower(), f"Table name mismatch: {relation}")
        model_fields = fields(cls)
        require([f.name for f in model_fields] == [c["field"] for c in entity["columns"]],
                f"Missing/extra/reordered entity fields: {relation}")
        for model_field, column in zip(model_fields, entity["columns"]):
            args = get_args(model_field.type)
            nullable = type(None) in args
            override = overrides.get((relation, column["logical_name"]), {})
            require(nullable == override.get("nullable", column["nullable"]),
                    f"Nullability mismatch: {relation}.{model_field.name}")
            value_type = next(t for t in args if t is not type(None)) if nullable else model_field.type
            domain = re.search(r"IN \((.*?)\)", column["constraints"])
            if domain:
                expected_domain = tuple(ast.literal_eval(v.strip()) for v in domain.group(1).split(","))
                require(get_origin(value_type) is Literal and get_args(value_type) == expected_domain,
                        f"Domain mismatch: {relation}.{model_field.name}")
            else:
                expected_type = {"DATE": date, "TIME": time, "DATETIME": datetime, "INT": int}.get(
                    column["sql_type"], str)
                require(value_type is expected_type, f"Type mismatch: {relation}.{model_field.name}")
        count += len(model_fields)

    python_files = list((ROOT / "backend").rglob("*.py"))
    python_files = [p for p in python_files if ".venv" not in p.parts]
    for path in python_files:
        compile(path.read_text(encoding="utf-8"), str(path), "exec")
    print(f"PASS: {len(modules)} modules, {len(entities)} entities, {count} baseline fields, "
          f"{len(python_files)} Python files; retained Phase 2 hash unchanged.")
    for conflict in manifest["conflicts"]:
        prefix = "RESOLVED" if conflict["status"].startswith("Resolved") else "PENDING"
        print(f"{prefix}: {conflict['id']} {conflict['entity']}.{conflict['field']}: {conflict['status']}")
    print("Scope: structural verification. Runtime evidence is recorded separately in docs/verification/.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, KeyError, SyntaxError, StopIteration) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        sys.exit(1)
