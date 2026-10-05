# Checklist review SQL

- [ ] Identifier names consistent lowercase snake_case; SQL keywords uppercase.
- [ ] DDL runs in documented order on a clean schema.
- [ ] FK/unique/domain rules match baseline and MySQL version behavior.
- [ ] Trigger/service multi-row rules have transaction and failure tests.
- [ ] Seed data synthetic and covers positive/negative/workflow states.
- [ ] At least 10 complex queries; JOIN/subquery/aggregate rationale stated.
- [ ] At least two required trigger/view objects are present and demonstrated.
- [ ] Indexes justified by queries; EXPLAIN evidence is real and dated.
- [ ] GRANT/REVOKE least privilege; application not connected as root.
- [ ] No credentials or private records in scripts/evidence.
