# Checklist review thiết kế

- [ ] Baseline docs opened from `01_Reference_and_Baseline`; no source file edited.
- [ ] Exactly 13 schema relations covered, attributes/PK/FK/null/default/domains traced.
- [ ] Doctor supertype and total/disjoint GP/Specialist joined mapping retained.
- [ ] BR/IC changes absent; cross-row rules have explicit enforcement owner and test.
- [ ] Logical-to-physical identifier map complete and consistent.
- [ ] Physical diagram supplements baseline and shows keys/cardinality accurately.
- [ ] Dictionary equals the SQL implementation.
- [ ] Any ambiguity recorded in decision log; no silent schema redesign.
