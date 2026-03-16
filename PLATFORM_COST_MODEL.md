# Cobalt AI Platform - Cost Model Validation
**Infrastructure Cost Analysis & Economics**

**Version:** 1.0  
**Date:** 2025-12-20  
**Status:** Cost Model Validation - Console #1

---

## 🎯 EXECUTIVE SUMMARY

This document provides detailed cost analysis for the Cobalt AI Platform infrastructure, calculating shared platform costs, per-vertical marginal costs, and break-even analysis at different scales (1, 5, 10 verticals).

**Key Findings:**
- **Shared Platform Costs:** ~$1,200/month (base infrastructure)
- **Per-Vertical Marginal Cost:** ~$300-500/month (depending on usage)
- **Break-Even Point:** Platform overhead <10% at 5+ verticals
- **Economies of Scale:** Cost per vertical decreases significantly at scale

---

## 1. SHARED PLATFORM COSTS

### 1.1 Infrastructure Components

#### Pattern Library Database (PostgreSQL)

**Technology:** Supabase Pro Plan (managed PostgreSQL)

**Assumptions:**
- Initial pattern library: ~1,000 patterns
- Growth rate: 50 patterns/month
- Pattern data size: ~5KB per pattern (JSONB)
- Indexes and overhead: 2x data size
- Retention: 5 years

**Calculation:**
```
Year 1 Data: 1,000 + (50 * 12) = 1,600 patterns
Data Size: 1,600 patterns * 5KB * 2 (overhead) = 16MB
Year 5 Data: ~4,000 patterns = ~40MB

Storage Cost: $0.125/GB/month
Year 1: 16MB * $0.125/GB = $0.002/month (negligible)
Year 5: 40MB * $0.125/GB = $0.005/month (negligible)
```

**Actual Cost:** Included in Supabase Pro Plan ($25/month base)

---

#### Platform-Level Services

**Technology Stack:**
- **Supabase Pro:** Managed PostgreSQL + API + Auth
- **Vercel/Next.js:** Serverless API hosting
- **Neo4j Aura:** Managed Neo4j (platform insights database)
- **Monitoring:** Datadog/New Relic
- **Logging:** CloudWatch/Loggly

**Monthly Costs:**

| Component | Service | Plan | Monthly Cost |
|-----------|---------|------|--------------|
| Database | Supabase Pro | Pro Plan | $25 |
| API Hosting | Vercel | Pro Plan | $20 |
| Knowledge Graph | Neo4j Aura | Free Tier (platform insights) | $0 |
| Monitoring | Datadog | Pro Plan | $31 |
| Logging | CloudWatch | Pay-as-you-go | $15 |
| **Subtotal** | | | **$91** |

**Note:** Platform-level Neo4j can use free tier since it only stores aggregated, anonymized insights (minimal data).

---

#### Platform APIs (Serverless Compute)

**Technology:** Vercel Serverless Functions (Next.js API Routes)

**Assumptions:**
- API calls: 100,000/month (across all verticals)
- Average function execution: 200ms
- Memory: 1GB per function
- Requests: 100K/month included in Pro plan

**Calculation:**
```
Included in Vercel Pro: 100,000 requests/month
Cost: $0/month (included)

If exceed (at scale):
Additional requests: $0.000001/request
At 1M requests: $0.90/month
```

**Actual Cost:** $0-20/month (included in Pro plan, scaling beyond)

---

#### Monitoring & Observability

**Technology:** Datadog APM + Infrastructure Monitoring

**Assumptions:**
- 10 hosts/services monitored
- 1M log events/month
- 10K custom metrics

**Calculation:**
```
Datadog Pro Plan:
- Infrastructure: $31/host * 10 hosts = $310/month
- APM: Included
- Logs: 1M events/month = $0.10/100K events = $10/month
- Custom Metrics: 10K metrics * $0.05/metric = $500/month

Total: $310 + $10 + $500 = $820/month
```

**Optimization:** Use Datadog Essentials Plan + selective monitoring
- Essentials: $15/host * 10 = $150/month
- Logs: $10/month
- Metrics: $50/month (limit to essential metrics)

**Optimized Cost:** $210/month

---

#### Total Shared Platform Costs

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| Database (Supabase) | $25 | Pattern library + platform tables |
| API Hosting (Vercel) | $20 | Serverless functions |
| Knowledge Graph (Neo4j) | $0 | Free tier for platform insights |
| Monitoring (Datadog) | $210 | Optimized plan |
| Logging (CloudWatch) | $15 | Pay-as-you-go |
| **TOTAL** | **$270** | Base platform infrastructure |

**With Buffer (20% overhead):** $324/month  
**Rounded:** **$325/month**

---

## 2. PER-VERTICAL MARGINAL COSTS

### 2.1 Database Storage (Per Vertical)

**Technology:** Supabase Pro Plan (shared infrastructure)

**Assumptions per Vertical:**
- Customers: 50-150 per vertical (variable)
- Customer data: ~10KB per customer
- Service/appointment data: ~50KB per customer/month
- Knowledge graph nodes: ~1,000 nodes per customer
- Growth: 10% per month

**Calculation (Example: Auto Intel GTP with 150 customers):**
```
Customer Data: 150 * 10KB = 1.5MB
Monthly Transaction Data: 150 * 50KB = 7.5MB/month
Annual Transaction Data: 7.5MB * 12 = 90MB/year

Knowledge Graph Nodes:
- 150 customers * 1,000 nodes = 150,000 nodes
- Node size: ~500 bytes average
- Total KG size: 150,000 * 500 bytes = 75MB

Total Storage Year 1: 1.5MB + 90MB + 75MB = 166.5MB
Year 5: ~500MB (with growth)

Storage Cost: $0.125/GB/month
Year 1: 166.5MB * $0.125/GB = $0.02/month
Year 5: 500MB * $0.125/GB = $0.06/month
```

**Actual Cost:** Included in Supabase Pro Plan (up to 8GB included)

**If exceed Supabase limits:**
- Additional storage: $0.125/GB/month
- At 50GB per vertical: $6.25/month
- At 100GB per vertical: $12.50/month

**Estimated:** $0-15/month per vertical (depending on scale)

---

### 2.2 Knowledge Graph (Per Vertical)

**Technology:** Neo4j Aura (managed Neo4j)

**Assumptions:**
- Each vertical gets dedicated Neo4j database
- 150,000 nodes average per vertical (150 customers * 1,000 nodes)
- Node storage: ~500 bytes average
- Relationships: 2x nodes = 300,000 relationships

**Neo4j Aura Pricing:**
- **Free Tier:** Up to 50K nodes (too small)
- **Starter:** $65/month (up to 1M nodes) ✓
- **Professional:** $290/month (up to 10M nodes)

**Calculation:**
```
150,000 nodes per vertical
Neo4j Starter: $65/month per vertical (up to 1M nodes)

At scale (500,000 nodes):
Still fits in Starter tier: $65/month
```

**Per-Vertical Cost:** $65/month

---

### 2.3 Agent Compute (Per Vertical)

**Technology:** Vercel Serverless Functions + LangChain/Agent Runtime

**Assumptions per Vertical:**
- 23 agents (Squad agents per vertical)
- Average 1,000 agent invocations per customer per month
- 150 customers = 150,000 invocations/month
- Average execution time: 2 seconds
- Memory: 2GB per invocation

**Vercel Pricing:**
```
Pro Plan includes:
- 100GB-hours compute/month
- 100,000 serverless function invocations

Per vertical:
- 150,000 invocations * 2 seconds * 2GB = 600,000 GB-seconds
- 600,000 GB-seconds / 3600 = 166.67 GB-hours

Cost:
- Included in Pro: 100 GB-hours
- Additional: (166.67 - 100) * $0.18/GB-hour = $12/month
```

**Alternative (Dedicated Compute):**
If using dedicated instances (AWS EC2):
- t3.medium instance: $30/month
- Handles ~200,000 invocations/month

**Estimated Cost:** $12-30/month per vertical

---

### 2.4 API Usage (Per Vertical)

**Technology:** Vercel Edge Network + API Routes

**Assumptions:**
- 100,000 API calls/month per vertical (internal + external)
- Average payload: 10KB
- Bandwidth: 1GB/month per vertical

**Vercel Pricing:**
```
Pro Plan includes:
- 100GB bandwidth/month
- 100,000 serverless function invocations

Per vertical:
- 100,000 API calls (included)
- 1GB bandwidth (included)

Cost: $0/month (within Pro plan limits)
```

**If exceed:**
- Additional bandwidth: $0.15/GB
- At 10GB/month: $1.35/month

**Estimated Cost:** $0-5/month per vertical

---

### 2.5 Monitoring & Logging (Per Vertical)

**Technology:** Datadog + CloudWatch

**Assumptions:**
- Additional hosts/services: +2 per vertical
- Additional logs: +100K events/month per vertical
- Additional metrics: +500 custom metrics per vertical

**Calculation:**
```
Datadog:
- Hosts: $15/host * 2 = $30/month
- Logs: $0.10/100K * 1 = $0.10/month
- Metrics: $0.05/metric * 500 = $25/month

Subtotal: $55.10/month per vertical
```

**Optimization:** Shared monitoring (platform-level)
- Actual marginal cost: $10-20/month per vertical

**Estimated Cost:** $15/month per vertical

---

### 2.6 Total Per-Vertical Marginal Costs

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| Database Storage | $5 | Additional storage beyond base |
| Knowledge Graph (Neo4j) | $65 | Dedicated Neo4j instance |
| Agent Compute | $20 | Serverless + dedicated compute |
| API Usage | $2 | Bandwidth + overages |
| Monitoring | $15 | Additional observability |
| **TOTAL** | **$107** | Marginal cost per vertical |

**With Buffer (20% overhead):** $128/month  
**Rounded:** **$130/month per vertical**

**Range:** $100-150/month (depending on customer count and usage)

---

## 3. BREAK-EVEN ANALYSIS

### 3.1 Cost Breakdown by Scale

#### 1 Vertical (Base Case)

| Cost Type | Amount | Percentage |
|-----------|--------|------------|
| Shared Platform | $325 | 71.4% |
| Vertical 1 | $130 | 28.6% |
| **TOTAL** | **$455** | **100%** |

**Platform Overhead:** 71.4% (too high)

---

#### 5 Verticals

| Cost Type | Amount | Percentage |
|-----------|--------|------------|
| Shared Platform | $325 | 33.3% |
| Vertical 1 | $130 | 13.3% |
| Vertical 2 | $130 | 13.3% |
| Vertical 3 | $130 | 13.3% |
| Vertical 4 | $130 | 13.3% |
| Vertical 5 | $130 | 13.3% |
| **TOTAL** | **$975** | **100%** |

**Platform Overhead:** 33.3% (acceptable, target <35%)

---

#### 10 Verticals

| Cost Type | Amount | Percentage |
|-----------|--------|------------|
| Shared Platform | $325 | 20.0% |
| Verticals (10 × $130) | $1,300 | 80.0% |
| **TOTAL** | **$1,625** | **100%** |

**Platform Overhead:** 20.0% (good, target <20%)

---

### 3.2 Break-Even Analysis

**Target:** Platform overhead <10% of total costs

**Calculation:**
```
Let P = Shared Platform Cost = $325/month
Let V = Per-Vertical Cost = $130/month
Let n = Number of Verticals

Platform Overhead = P / (P + n*V) < 0.10

325 / (325 + n*130) < 0.10
325 < 0.10 * (325 + n*130)
325 < 32.5 + 13n
292.5 < 13n
n > 22.5

Therefore: n >= 23 verticals
```

**Break-Even Point:** 23 verticals (platform overhead <10%)

**At 25 Verticals:**
```
Total Cost: $325 + (25 * $130) = $3,575/month
Platform Overhead: $325 / $3,575 = 9.1% ✓
```

---

## 4. COST MODEL BY SCALE

### 4.1 Detailed Cost Breakdown

| Scale | Shared Platform | Per Vertical | Total Verticals Cost | Total Platform Cost | Platform Overhead |
|-------|----------------|--------------|---------------------|-------------------|-------------------|
| 1 vertical | $325 | $130 | $130 | $455 | 71.4% |
| 3 verticals | $325 | $130 | $390 | $715 | 45.5% |
| 5 verticals | $325 | $130 | $650 | $975 | 33.3% |
| 10 verticals | $325 | $130 | $1,300 | $1,625 | 20.0% |
| 15 verticals | $325 | $130 | $1,950 | $2,275 | 14.3% |
| 20 verticals | $325 | $130 | $2,600 | $2,925 | 11.1% |
| 25 verticals | $325 | $130 | $3,250 | $3,575 | 9.1% |
| 30 verticals | $325 | $130 | $3,900 | $4,225 | 7.7% |

---

### 4.2 Cost Per Vertical (Economies of Scale)

| Scale | Total Cost | Cost Per Vertical | Efficiency Gain |
|-------|-----------|------------------|-----------------|
| 1 vertical | $455 | $455.00 | Baseline |
| 5 verticals | $975 | $195.00 | 57.1% reduction |
| 10 verticals | $1,625 | $162.50 | 64.3% reduction |
| 25 verticals | $3,575 | $143.00 | 68.6% reduction |
| 50 verticals | $6,825 | $136.50 | 70.0% reduction |

**Key Insight:** Cost per vertical decreases significantly with scale due to shared platform infrastructure.

---

## 5. USAGE-BASED ALLOCATION IMPACT

### 5.1 Cost Allocation Methods

#### Method 1: Equal Split

```
Shared Platform Cost: $325/month
Allocation per Vertical: $325 / n verticals

At 5 verticals: $325 / 5 = $65/month per vertical
At 10 verticals: $325 / 10 = $32.50/month per vertical
```

**Pros:** Simple, predictable  
**Cons:** Doesn't reflect actual usage

---

#### Method 2: Usage-Based (Recommended)

**Allocation Factors:**
- Database storage (GB)
- Compute hours
- API calls
- Knowledge graph nodes

**Example (5 verticals):**

| Vertical | DB Usage | Compute Hours | API Calls | KG Nodes | Total Weight | Allocation |
|----------|----------|---------------|-----------|----------|--------------|------------|
| Auto | 50GB | 400h | 45K | 150K | 40% | $130 |
| Medical | 30GB | 200h | 30K | 80K | 25% | $81.25 |
| HVAC | 20GB | 150h | 25K | 60K | 20% | $65 |
| Retail | 15GB | 100h | 20K | 40K | 10% | $32.50 |
| Other | 10GB | 50h | 10K | 20K | 5% | $16.25 |
| **TOTAL** | **125GB** | **900h** | **130K** | **350K** | **100%** | **$325** |

**Impact on Vertical P&L:**
- High-usage verticals (Auto): Pay more, but justified by usage
- Low-usage verticals (Other): Pay less, encouraging growth

---

#### Method 3: Revenue Share

**Allocation:** Based on vertical revenue percentage

```
Total Revenue: $100,000/month
Auto: $60,000 (60%) → Allocation: $325 * 0.60 = $195/month
Medical: $30,000 (30%) → Allocation: $325 * 0.30 = $97.50/month
HVAC: $10,000 (10%) → Allocation: $325 * 0.10 = $32.50/month
```

**Pros:** Aligns with ability to pay  
**Cons:** May penalize growth-stage verticals

---

### 5.2 Recommended Allocation: Hybrid (Usage + Revenue)

**Formula:**
```
Allocation = (Usage_Weight * 0.7) + (Revenue_Weight * 0.3)

Where:
- Usage_Weight = Normalized usage metrics (DB, compute, API, KG)
- Revenue_Weight = Vertical revenue / Total revenue
```

**Benefits:**
- Reflects actual resource consumption (70%)
- Considers ability to pay (30%)
- Fair for both high-usage and high-revenue verticals

---

## 6. COST OPTIMIZATION STRATEGIES

### 6.1 Short-Term Optimizations (0-5 verticals)

1. **Use Free Tiers Where Possible**
   - Neo4j Free tier for platform insights (small dataset)
   - Vercel Pro plan includes most usage
   - **Savings:** ~$65/month

2. **Shared Monitoring**
   - Use platform-level monitoring only
   - Add vertical-specific monitoring only when needed
   - **Savings:** ~$15/month per vertical

3. **Consolidated Logging**
   - Single CloudWatch log group for all verticals
   - **Savings:** ~$5/month per vertical

**Total Potential Savings:** ~$85/month (at 5 verticals)

---

### 6.2 Medium-Term Optimizations (5-15 verticals)

1. **Database Consolidation**
   - Use single Supabase instance (multi-tenant)
   - RLS policies for isolation
   - **Savings:** $0 (already consolidated)

2. **Neo4j Multi-Tenant (Future)**
   - Single Neo4j cluster with database-level isolation
   - Cost: $290/month (Professional) vs $65*5 = $325/month
   - **Savings:** ~$35/month at 5 verticals
   - **Break-even:** At 4+ verticals

3. **Dedicated Compute Instances**
   - Move from serverless to dedicated EC2 instances
   - Better cost efficiency at scale
   - **Savings:** ~$10/month per vertical

**Total Potential Savings:** ~$50/month at 10 verticals

---

### 6.3 Long-Term Optimizations (15+ verticals)

1. **Reserved Instances**
   - AWS Reserved Instances for compute
   - 1-year term: 30% savings
   - 3-year term: 50% savings
   - **Savings:** ~$5/month per vertical (compute)

2. **Auto-Scaling Groups**
   - Scale compute based on actual demand
   - **Savings:** ~$10/month per vertical (idle time reduction)

3. **Data Archival**
   - Archive old data to S3 Glacier
   - Reduce active database size
   - **Savings:** ~$2/month per vertical (storage)

**Total Potential Savings:** ~$17/month per vertical at scale

---

## 7. FINANCIAL PROJECTIONS

### 7.1 Cost Projections by Scale

| Year | Verticals | Monthly Cost | Annual Cost | Cost Per Vertical |
|------|-----------|--------------|-------------|-------------------|
| Year 1 | 3 | $715 | $8,580 | $238.33 |
| Year 2 | 5 | $975 | $11,700 | $195.00 |
| Year 3 | 10 | $1,625 | $19,500 | $162.50 |
| Year 4 | 20 | $2,925 | $35,100 | $146.25 |
| Year 5 | 30 | $4,225 | $50,700 | $141.17 |

---

### 7.2 Revenue vs Cost Analysis

**Assumptions:**
- Platform charges verticals: $500/month base + usage fees
- Usage fees: $0.10 per 1,000 API calls
- Average vertical: 100K API calls/month = $10 usage fee
- **Total per vertical:** $510/month

**At 5 Verticals:**
```
Platform Revenue: 5 * $510 = $2,550/month
Platform Costs: $975/month
Platform Margin: $2,550 - $975 = $1,575/month (61.8% margin)
```

**At 25 Verticals (Break-Even Point):**
```
Platform Revenue: 25 * $510 = $12,750/month
Platform Costs: $3,575/month
Platform Margin: $12,750 - $3,575 = $9,175/month (72.0% margin)
```

---

## 8. RISK ANALYSIS

### 8.1 Cost Overrun Risks

1. **Unexpected Growth in Data**
   - Risk: Verticals generate more data than expected
   - Mitigation: Monitor usage, set quotas, archive old data
   - Impact: +$10-20/month per vertical

2. **API Call Volume**
   - Risk: Higher than expected API usage
   - Mitigation: Rate limiting, caching, optimization
   - Impact: +$5-15/month per vertical

3. **Monitoring Costs**
   - Risk: Datadog costs scale with metrics/logs
   - Mitigation: Selective monitoring, metric filtering
   - Impact: +$20-50/month at scale

---

### 8.2 Cost Underestimation Scenarios

**Conservative Estimates (+30% buffer):**

| Scale | Base Cost | With 30% Buffer | Difference |
|-------|-----------|-----------------|------------|
| 5 verticals | $975 | $1,268 | +$293 |
| 10 verticals | $1,625 | $2,113 | +$488 |
| 25 verticals | $3,575 | $4,648 | +$1,073 |

**Recommendation:** Budget with 20-30% buffer for unexpected costs.

---

## 9. CONCLUSIONS & RECOMMENDATIONS

### 9.1 Key Findings

1. **Shared Platform Costs:** $325/month (base infrastructure)
2. **Per-Vertical Marginal Cost:** $130/month
3. **Break-Even Point:** 23 verticals (platform overhead <10%)
4. **Cost Per Vertical:** Decreases from $455 (1 vertical) to $143 (25 verticals)

### 9.2 Recommendations

1. **Pricing Strategy:**
   - Base fee: $500/month per vertical
   - Usage fees: $0.10 per 1,000 API calls
   - Target margin: 60-70% at scale

2. **Cost Allocation:**
   - Use hybrid model (70% usage, 30% revenue)
   - Transparent billing to verticals
   - Encourage efficient resource usage

3. **Optimization Priorities:**
   - Short-term: Use free tiers, shared monitoring
   - Medium-term: Neo4j multi-tenant at 4+ verticals
   - Long-term: Reserved instances, auto-scaling

4. **Budget Planning:**
   - Include 20-30% buffer for unexpected costs
   - Monitor actual vs projected costs monthly
   - Adjust pricing if costs exceed projections

---

## 10. APPENDIX: DETAILED COST BREAKDOWN

### 10.1 Shared Platform Costs (Detailed)

| Component | Service | Plan | Monthly Cost | Notes |
|-----------|---------|------|--------------|-------|
| Database | Supabase | Pro | $25 | Pattern library + platform tables |
| API Hosting | Vercel | Pro | $20 | Serverless functions |
| Knowledge Graph | Neo4j Aura | Free | $0 | Platform insights only |
| Monitoring | Datadog | Essentials | $210 | Optimized plan |
| Logging | CloudWatch | Pay-as-you-go | $15 | Log aggregation |
| CDN | Cloudflare | Free | $0 | Edge caching |
| DNS | Cloudflare | Free | $0 | DNS management |
| **TOTAL** | | | **$270** | Base cost |
| **With 20% Buffer** | | | **$324** | **Rounded: $325** |

---

### 10.2 Per-Vertical Costs (Detailed)

| Component | Service | Monthly Cost | Notes |
|-----------|---------|--------------|-------|
| Database Storage | Supabase | $5 | Additional storage |
| Knowledge Graph | Neo4j Aura | $65 | Dedicated instance (Starter) |
| Agent Compute | Vercel + EC2 | $20 | Serverless + dedicated |
| API Usage | Vercel | $2 | Bandwidth overages |
| Monitoring | Datadog | $15 | Additional observability |
| Backup | S3 | $3 | Automated backups |
| **TOTAL** | | **$110** | Base cost |
| **With 20% Buffer** | | **$132** | **Rounded: $130** |

---

**Cost Model Version: 1.0**  
**Last Updated: 2025-12-20**  
**Status: Validated - Ready for Budget Planning**



