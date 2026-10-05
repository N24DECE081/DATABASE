"""Parameterized entity persistence. Identifiers come only from trusted dataclasses."""
from dataclasses import asdict, fields

from ..db import execute, query
from .. import entities

ENTITY_TYPES = {getattr(entities, name).table_name: getattr(entities, name) for name in entities.__all__}


def descriptor(entity_type):
    if ENTITY_TYPES.get(entity_type.table_name) is not entity_type:
        raise ValueError("Unknown entity type")
    return entity_type.table_name, [field.name for field in fields(entity_type)]


def get(entity_type, identity, *, lock=False):
    table, columns = descriptor(entity_type)
    row = query(f"SELECT * FROM `{table}` WHERE `{columns[0]}` = %s" + (" FOR UPDATE" if lock else ""),
                (identity,), one=True)
    return entity_type(**row) if row else None


def insert(entity):
    table, columns = descriptor(type(entity))
    values = asdict(entity)
    execute(f"INSERT INTO `{table}` ({', '.join('`'+c+'`' for c in columns)}) "
            f"VALUES ({', '.join('%s' for _ in columns)})", tuple(values[c] for c in columns))
    return entity


def update(entity):
    table, columns = descriptor(type(entity))
    values = asdict(entity)
    assignments = ", ".join(f"`{column}` = %s" for column in columns[1:])
    execute(f"UPDATE `{table}` SET {assignments} WHERE `{columns[0]}` = %s",
            tuple(values[c] for c in columns[1:]) + (values[columns[0]],))
    return entity
