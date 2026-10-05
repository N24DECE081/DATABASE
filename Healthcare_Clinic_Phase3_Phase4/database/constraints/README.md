# Vị trí ràng buộc

PK, FK, UNIQUE, NOT NULL/default và CHECK nằm trong `migrations/001_initial_schema.sql`. Rules nhiều dòng/đa bảng nằm trong `triggers/` và transaction service ở backend. Không chạy file constraint thứ hai lặp lại DDL. EndTime nullable là override BASELINE-01 được user cho phép, các metadata gốc giữ trong manifest.
