# Quick Start: Apply Performance Optimizations

## 🚀 3-Step Process (2-3 minutes)

### Step 1: Open Supabase SQL Editor

**URL:** https://supabase.com/dashboard/project/ifepcsiaulutwwprmqww/sql

1. Navigate to the URL above
2. Click **"New query"** button (top right)
3. You're ready!

---

### Step 2: Copy & Paste SQL Script

**File to copy:** `src/medical/scripts/optimize-performance.sql`

**In Cursor/Terminal:**
```bash
cd artifact-storage-api
cat src/medical/scripts/optimize-performance.sql
```

**Then:**
1. Select all output (Ctrl+A or Cmd+A)
2. Copy (Ctrl+C or Cmd+C)
3. Paste into Supabase SQL Editor (Ctrl+V or Cmd+V)

---

### Step 3: Execute & Verify

**In Supabase SQL Editor:**
1. Click **"Run"** button (or press Ctrl+Enter / Cmd+Enter)
2. Wait for execution (30-60 seconds)
3. Should see: **"Success. No rows returned"**

**Verify Indexes Created:**
Run this query in Supabase:
```sql
SELECT 
  indexname,
  tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_medical_%'
ORDER BY tablename, indexname;
```

**Expected:** 16+ indexes listed (includes existing + new ones)

---

## ✅ Success Indicators

- ✅ Query executed without errors
- ✅ "Success. No rows returned" message
- ✅ Verification query shows 16+ indexes
- ✅ Ready to run benchmarks

---

## ⚠️ Troubleshooting

**Error: "Index already exists"**
- ✅ Safe to ignore (IF NOT EXISTS handles this)
- ✅ Indexes are idempotent

**Error: "Relation does not exist"**
- ❌ Check table name (should have `medical_` prefix)
- ❌ Verify schema is deployed first

**Long execution time (>2 minutes)**
- ⚠️ Normal for large tables
- ⏳ Wait for completion
- ✅ Should complete within 5 minutes max

---

**Total Time:** ~2-3 minutes  
**Difficulty:** Easy  
**Risk:** Low (reversible)












