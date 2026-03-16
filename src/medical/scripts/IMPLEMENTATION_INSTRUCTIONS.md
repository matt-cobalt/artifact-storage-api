# Performance Optimization - Implementation Instructions

## Stage 3: Implement Optimizations

### Prerequisites
- Access to Supabase SQL Editor
- Medical vertical schema already deployed
- 16 new indexes ready to apply

### Step-by-Step Instructions

#### Step 1: Open Supabase SQL Editor

1. Navigate to: https://supabase.com/dashboard/project/ifepcsiaulutwwprmqww/sql
2. Click **"New query"** button

#### Step 2: Copy Optimization Script

Copy the entire contents of:
```
artifact-storage-api/src/medical/scripts/optimize-performance.sql
```

#### Step 3: Paste and Execute

1. Paste the SQL script into the SQL Editor
2. Review the script (16 CREATE INDEX statements + 8 ANALYZE statements)
3. Click **"Run"** button (or press Ctrl+Enter)

#### Step 4: Verify Execution

**Expected Output:**
```
Success. No rows returned
```

**Verify Indexes Created:**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_medical_%'
ORDER BY tablename, indexname;
```

Should show **all 16 new indexes** plus existing ones.

**Verify ANALYZE Completed:**
```sql
SELECT 
  schemaname,
  tablename,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'medical_%';
```

Should show recent analyze timestamps.

#### Step 5: Check for Errors

If any errors occur:
- Check error message
- Most common: Index already exists (safe to ignore with IF NOT EXISTS)
- Verify table names match exactly

### Expected Timeline

- **Index Creation:** 5-30 seconds (depending on table sizes)
- **ANALYZE:** 10-60 seconds (depends on data volume)
- **Total:** 15-90 seconds

### Verification Checklist

- [ ] All 16 indexes created successfully
- [ ] No critical errors in execution
- [ ] ANALYZE completed on all tables
- [ ] Index list query shows new indexes
- [ ] Ready for benchmark testing

---

## Post-Implementation Testing

After applying optimizations, run:

```bash
node src/medical/scripts/analyze-slow-queries.js
```

Compare results:
- Before: Baseline performance
- After: Optimized performance
- Expected: 50-70% improvement

---

## Rollback (If Needed)

If optimizations cause issues, indexes can be dropped:

```sql
-- Drop specific index
DROP INDEX IF EXISTS idx_medical_appointments_clinic_date_status;

-- Or drop all new indexes (use with caution)
DROP INDEX IF EXISTS idx_medical_appointments_clinic_date_status;
DROP INDEX IF EXISTS idx_medical_appointments_date_time;
-- ... (repeat for all 16 indexes)
```

---

## Troubleshooting

### Issue: "Index already exists"
**Solution:** Safe to ignore - indexes use `IF NOT EXISTS`

### Issue: "Relation does not exist"
**Solution:** Verify table name matches exactly (includes `medical_` prefix)

### Issue: "Permission denied"
**Solution:** Ensure using service_role key or have CREATE INDEX permission

### Issue: Long execution time
**Solution:** Normal for large tables - wait for completion

---

**Status:** Ready for implementation  
**Estimated Time:** 1-2 minutes  
**Risk Level:** Low (reversible)












