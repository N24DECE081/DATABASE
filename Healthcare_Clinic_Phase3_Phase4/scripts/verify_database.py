"""Compare the live schema to approved metadata; execute Q01-Q12 and EXPLAIN."""
import json
import os
from pathlib import Path
import re

from dotenv import load_dotenv
import mysql.connector
from sql_runner import statements

ROOT = Path(__file__).resolve().parents[1]


def main():
    load_dotenv(ROOT / "backend/.env")
    manifest=json.loads((ROOT / "docs/module_manifest.json").read_text(encoding="utf-8"))
    overrides={(v["entity"],v["field"]):v for v in manifest.get("approved_overrides",[])}
    database=os.environ["MYSQL_DATABASE"]
    connection=mysql.connector.connect(host=os.environ["MYSQL_HOST"],port=int(os.environ["MYSQL_PORT"]),
        user=os.environ["MYSQL_USER"],password=os.environ["MYSQL_PASSWORD"],database=database,autocommit=True)
    results={"database":database,"fields_checked":0,"queries":[],"plans":{}}
    try:
        with connection.cursor(dictionary=True) as cursor:
            cursor.execute("SET time_zone='+07:00'")
            cursor.execute("SELECT VERSION() AS version, @@sql_mode AS sql_mode, @@session.time_zone AS time_zone")
            results["runtime"]=cursor.fetchone()
            cursor.execute("SELECT TABLE_NAME AS name, TABLE_TYPE AS kind FROM information_schema.TABLES WHERE TABLE_SCHEMA=%s",(database,))
            tables=cursor.fetchall()
            assert {t["name"] for t in tables if t["kind"]=="BASE TABLE"}=={e["table"] for e in manifest["entities"]}
            results["base_tables"]=len(manifest["entities"])
            results["views"]=len([t for t in tables if t["kind"]=="VIEW"])
            for entity in manifest["entities"]:
                cursor.execute("""SELECT COLUMN_NAME AS name, COLUMN_TYPE AS data_type, IS_NULLABLE AS nullable,
                    COLUMN_DEFAULT AS default_value FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA=%s AND TABLE_NAME=%s ORDER BY ORDINAL_POSITION""",(database,entity["table"]))
                columns=cursor.fetchall()
                assert [c["name"] for c in columns]==[c["field"] for c in entity["columns"]],entity["table"]
                for actual,expected in zip(columns,entity["columns"]):
                    override=overrides.get((entity["logical_name"],expected["logical_name"]),{})
                    assert actual["data_type"].upper()==expected["sql_type"],(entity["table"],actual)
                    assert (actual["nullable"]=="YES")==override.get("nullable",expected["nullable"]),(entity["table"],actual)
                    default=override.get("default",expected["default"])
                    expected_default=None if default in ("None","NULL") else default.strip("'").lower()
                    actual_default=None if actual["default_value"] is None else str(actual["default_value"]).lower().replace("()","")
                    assert expected_default==actual_default,(entity["table"],actual)
                    results["fields_checked"]+=1
            cursor.execute("SELECT COUNT(*) AS n FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=%s",(database,))
            results["triggers_visible_to_app"]=cursor.fetchone()["n"]
            results["trigger_scope"]="DBA/test suite verifies trigger behavior; app lacks TRIGGER metadata privilege."
            cursor.execute("SELECT COUNT(*) AS n FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=%s AND REFERENCED_TABLE_NAME IS NOT NULL",(database,))
            results["foreign_keys"]=cursor.fetchone()["n"]
            cursor.execute("""SELECT COUNT(*) AS n FROM doctor d LEFT JOIN general_practitioner gp ON gp.doctor_id=d.doctor_id
                LEFT JOIN specialist sp ON sp.doctor_id=d.doctor_id
                WHERE ((gp.doctor_id IS NOT NULL)+(sp.doctor_id IS NOT NULL))<>1""")
            results["invalid_doctor_subtypes"]=cursor.fetchone()["n"]
            cursor.execute("SELECT COUNT(*) AS n FROM prescription rx WHERE NOT EXISTS (SELECT 1 FROM prescription_item pi WHERE pi.prescription_id=rx.prescription_id)")
            results["empty_prescriptions"]=cursor.fetchone()["n"]
            assert results["invalid_doctor_subtypes"]==0 and results["empty_prescriptions"]==0
            paths=sorted((ROOT / "database/queries").rglob("q*.sql"),key=lambda p:p.name)
            assert len(paths)==12
            for path in paths:
                query_sql=None
                for sql in statements(path.read_text(encoding="utf-8")):
                    cursor.execute(sql)
                    if cursor.with_rows:
                        rows=cursor.fetchall()
                        query_sql=sql
                results["queries"].append({"id":path.name[:3],"file":path.relative_to(ROOT).as_posix(),
                    "rows":len(rows),"output":rows,"status":"PASS"})
                if path.name[:3] in ("q01","q07","q08"):
                    cursor.execute("EXPLAIN FORMAT=JSON "+query_sql)
                    results["plans"][path.name[:3]]=json.loads(cursor.fetchone()["EXPLAIN"])
            cursor.execute("SHOW GRANTS")
            results["app_grants"]=[list(row.values())[0] for row in cursor.fetchall()]
            cursor.execute("SELECT CURRENT_ROLE() AS active_role")
            results["active_role"]=cursor.fetchone()["active_role"]
            try:
                cursor.execute("DELETE FROM user_account WHERE user_id=%s",("__nonexistent_privilege_probe__",))
            except mysql.connector.Error as error:
                assert error.errno==1142
                results["delete_denied"]=True
            else:
                raise AssertionError("Application account unexpectedly has DELETE permission")
        output=ROOT / "docs/verification/database.json"
        output.parent.mkdir(parents=True,exist_ok=True)
        output.write_text(json.dumps(results,ensure_ascii=False,indent=2,default=str)+"\n",encoding="utf-8")
        print(f"PASS: {results['base_tables']} tables, {results['fields_checked']} fields, {results['views']} views, "
              f"{results['foreign_keys']} FKs; Q01-Q12 executed; EXPLAIN Q01/Q07/Q08 captured.")
        print("MySQL",results["runtime"]["version"],"; evidence:",output)
    finally:
        connection.close()


if __name__ == "__main__":
    main()
