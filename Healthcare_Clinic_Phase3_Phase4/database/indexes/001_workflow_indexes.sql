
-- ============================================
-- DATABASE STRUCTURE REPORT
-- Owner: Nguyen Duong Thanh Mai
-- Read-only verification - No data modification
-- ============================================

-- 1. DATABASE INFORMATION
SELECT
    DATABASE() AS Database_Name;

-- 2. TOTAL TABLES / ENTITIES
SELECT
    COUNT(*) AS Total_Tables,
    COUNT(*) AS Total_Entities
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_type = 'BASE TABLE';

-- 3. TOTAL VIEWS
SELECT
    COUNT(*) AS Total_Views
FROM information_schema.views
WHERE table_schema = DATABASE();

-- 4. VIEW LIST
SELECT
    table_name AS View_Name
FROM information_schema.views
WHERE table_schema = DATABASE()
ORDER BY table_name;

-- 5. TOTAL INDEXES
SELECT
    COUNT(DISTINCT CONCAT(table_name, '.', index_name))
    AS Total_Indexes
FROM information_schema.statistics
WHERE table_schema = DATABASE();

-- 6. INDEX DETAILS
SELECT
    table_name AS Table_Name,
    index_name AS Index_Name,
    GROUP_CONCAT(column_name ORDER BY seq_in_index) AS Index_Columns,
    MAX(non_unique) AS Non_Unique,
    MAX(index_type) AS Index_Type
FROM information_schema.statistics
WHERE table_schema = DATABASE()
GROUP BY table_name, index_name
ORDER BY table_name, index_name;

-- 7. TOTAL PRIMARY KEYS
SELECT
    COUNT(DISTINCT table_name) AS Total_Primary_Keys
FROM information_schema.table_constraints
WHERE constraint_schema = DATABASE()
  AND constraint_type = 'PRIMARY KEY';

-- 8. TOTAL FOREIGN KEYS
SELECT
    COUNT(*) AS Total_Foreign_Keys
FROM information_schema.table_constraints
WHERE constraint_schema = DATABASE()
  AND constraint_type = 'FOREIGN KEY';

-- 9. FOREIGN KEY DETAILS
SELECT
    table_name AS Table_Name,
    constraint_name AS Foreign_Key,
    referenced_table_name AS Referenced_Table
FROM information_schema.key_column_usage
WHERE constraint_schema = DATABASE()
  AND referenced_table_name IS NOT NULL
ORDER BY table_name, constraint_name;

-- 10. CHECK FOUR EXISTING INDEXES
SELECT
    table_name,
    index_name,
    column_name,
    seq_in_index
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND index_name IN (
      'ix_appointment_doctor_time_status',
      'ix_appointment_patient_time',
      'ix_history_session_record',
      'ix_prescription_session_date'
  )
ORDER BY index_name, seq_in_index;
