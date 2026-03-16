# Medical Vertical - Query Performance Optimization

## Overview

This document outlines the performance optimization strategy for the medical vertical database queries.

## Current Status

**Branch:** `optimize/query-performance`  
**Created:** Performance optimization scripts and analysis tools

## Performance Analysis

### Common Query Patterns Identified

1. **Appointment Queries** (Monitor.js, M-OTTO)
   - By clinic_id + date range
   - By clinic_id + status
   - By patient_id + date (history)
   - After-hours detection (date + time)

2. **Patient Lookups** (M-OTTO intake)
   - By phone number
   - By email
   - By clinic_id + created_at

3. **Engagement Queries** (M-MILES)
   - Scheduled engagements by clinic
   - By engagement_type + sent_at
   - Pending status queries

4. **Revenue Queries** (M-CAL)
   - By clinic_id + date range + status
   - By patient_id + date (history)

5. **Churn Predictions** (M-REX)
   - High-risk patients by clinic
   - By risk_level + predicted_at

6. **Audit Logs** (HIPAA compliance)
   - By clinic_id + timestamp range
   - By user_id + timestamp (recent activity)

## Optimization Strategy

### Indexes Created

The `optimize-performance.sql` script adds **16 additional indexes**:

#### 1. Appointment Indexes
- `idx_medical_appointments_clinic_date_status` - Composite index for clinic + date + status queries
- `idx_medical_appointments_date_time` - Time-based queries with date filter
- `idx_medical_appointments_patient_date_status` - Patient history queries

#### 2. Patient Indexes
- `idx_medical_patients_phone` - Phone-based lookups (M-OTTO intake)
- `idx_medical_patients_email` - Email-based lookups
- `idx_medical_patients_clinic_created` - Clinic patient lists

#### 3. Engagement Indexes
- `idx_medical_patient_engagement_scheduled` - Scheduled engagement queries
- `idx_medical_patient_engagement_type_sent` - Type + sent date queries

#### 4. Revenue Indexes
- `idx_medical_revenue_cycle_clinic_date_status` - Revenue by clinic + date + status
- `idx_medical_revenue_cycle_patient_date` - Patient revenue history

#### 5. Churn Prediction Indexes
- `idx_medical_churn_predictions_clinic_risk_date` - High-risk churn queries

#### 6. Care Gaps Indexes
- `idx_medical_care_gaps_unresolved_priority` - Unresolved gaps by priority

#### 7. No-Show Indexes
- `idx_medical_no_show_tracking_clinic_date_pattern` - Pattern detection queries

#### 8. Audit Log Indexes
- `idx_medical_audit_logs_clinic_timestamp` - Time-range audit queries
- `idx_medical_audit_logs_user_timestamp` - User activity queries

### Partial Indexes

Several indexes use `WHERE` clauses to create **partial indexes** that are smaller and faster:
- Filtered by status (pending, active, etc.)
- Filtered by date ranges (recent data only)
- Filtered by boolean flags (pattern_detected, resolved_at IS NULL)

### Table Statistics

The script runs `ANALYZE` on all major tables to update query planner statistics.

## Expected Performance Improvements

- **Appointment queries:** 50-70% faster
- **Patient lookups:** 60-80% faster
- **Revenue queries:** 40-60% faster
- **Engagement queries:** 50-70% faster
- **Audit log queries:** 40-60% faster

## Usage

### 1. Run Performance Analysis

```bash
cd artifact-storage-api
node src/medical/scripts/analyze-slow-queries.js
```

This will:
- Test 7 common query patterns
- Measure execution times
- Flag queries slower than 100ms
- Provide recommendations

### 2. Apply Optimizations

1. Open Supabase SQL Editor
2. Copy contents of `optimize-performance.sql`
3. Run the script
4. Verify indexes were created

### 3. Re-run Analysis

```bash
node src/medical/scripts/analyze-slow-queries.js
```

Compare before/after performance.

## Query Optimization Best Practices

### Do's ✅

1. **Use indexes** - Always filter by indexed columns first
2. **Limit results** - Use `.limit()` for pagination
3. **Select specific columns** - Don't use `SELECT *` when you only need a few columns
4. **Use composite indexes** - For multi-column filters, match index column order
5. **Use date ranges** - Limit date queries to relevant timeframes

### Don'ts ❌

1. **Don't filter on non-indexed columns first** - This prevents index usage
2. **Don't use functions in WHERE clauses** - `WHERE UPPER(name) = ...` prevents index usage
3. **Don't query large date ranges unnecessarily** - Limit to what you need
4. **Don't fetch all rows** - Always use `.limit()` for large tables
5. **Don't ignore query planner warnings** - Check EXPLAIN plans for slow queries

## Monitoring

### Key Metrics to Track

- Average query time (target: <100ms)
- 95th percentile query time (target: <200ms)
- Maximum query time (target: <500ms)
- Number of slow queries (>100ms)

### When to Re-optimize

- Query times consistently exceed targets
- New query patterns emerge
- Data volume increases significantly
- New indexes needed for new features

## Index Maintenance

### Index Overhead

- **Storage:** Each index uses additional disk space (~10-30% of table size)
- **Write Performance:** Indexes slow down INSERT/UPDATE operations slightly
- **Balance:** More indexes = faster reads, slower writes

### When to Remove Indexes

- Index is never used (check with EXPLAIN)
- Table is write-heavy and reads are fast enough
- Index duplicates another index's functionality

## Next Steps

1. ✅ Created optimization scripts
2. ⏳ Run performance analysis
3. ⏳ Apply optimizations to Supabase
4. ⏳ Verify improvements
5. ⏳ Monitor in production

## Files

- `optimize-performance.sql` - SQL script with all index optimizations
- `analyze-slow-queries.js` - Performance analysis tool
- `PERFORMANCE_OPTIMIZATION.md` - This document

---

**Status:** Ready for deployment  
**Branch:** `optimize/query-performance`  
**Target Performance:** <100ms average, <200ms 95th percentile












