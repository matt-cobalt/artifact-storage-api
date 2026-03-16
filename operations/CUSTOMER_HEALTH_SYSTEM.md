# Customer Health Scoring System
**Predictive Churn Prevention & Intervention System**

**Version:** 1.0  
**Date:** 2024-12-21  
**Status:** Production-Ready - Ready for Week 1 Deployment

---

## Table of Contents

1. [Health Score Calculation](#health-score-calculation)
2. [Health Score Components](#health-score-components)
3. [Churn Prediction Model](#churn-prediction-model)
4. [Intervention Triggers](#intervention-triggers)
5. [Intervention Playbooks](#intervention-playbooks)
6. [Health Dashboard](#health-dashboard)
7. [Metrics & Reporting](#metrics--reporting)

---

## Health Score Calculation

### Overall Health Score: 0-100

**Formula:**
```
Health Score = (
  Usage Score × 0.30 +
  Value Score × 0.25 +
  Engagement Score × 0.20 +
  Financial Score × 0.15 +
  Support Score × 0.10
) - Risk Penalties
```

**Health Tiers:**
- **Green (80-100):** Healthy, expansion opportunity
- **Yellow (50-79):** At risk, needs attention
- **Red (0-49):** Critical, high churn risk

---

## Health Score Components

### 1. Usage Score (0-100, Weight: 30%)

**Metrics:**
- Login frequency (daily active users)
- Feature adoption (which features being used)
- Data volume (appointments, patients, transactions)
- Agent interaction (are they engaging with Squad agents)

**Calculation:**
```
Usage Score = (
  Login Frequency Score × 0.40 +
  Feature Adoption Score × 0.30 +
  Data Volume Score × 0.20 +
  Agent Interaction Score × 0.10
)

Login Frequency Score = min(100, (logins_last_30_days / 20) × 100)
Feature Adoption Score = (features_used / total_features) × 100
Data Volume Score = min(100, (transactions_last_30_days / baseline) × 100)
Agent Interaction Score = (agents_engaged / total_agents) × 100
```

**Baseline Thresholds:**
- Login frequency: 20 logins/month (target)
- Feature adoption: 60% of available features (target)
- Data volume: Customer-specific baseline (calculated from Month 2-3 average)
- Agent interaction: 5+ agents engaged/month (target)

---

### 2. Value Score (0-100, Weight: 25%)

**Metrics:**
- Time saved (measured by automation)
- Revenue increased (upsell acceptance, no-show reduction)
- Efficiency gains (more patients/appointments per day)
- ROI realization (actual vs. promised ROI)

**Calculation:**
```
Value Score = (
  Time Saved Score × 0.30 +
  Revenue Impact Score × 0.40 +
  Efficiency Score × 0.20 +
  ROI Realization Score × 0.10
)

Time Saved Score = min(100, (hours_saved_month / target_hours) × 100)
Revenue Impact Score = min(100, (revenue_increase / target_increase) × 100)
Efficiency Score = min(100, (efficiency_improvement / target_improvement) × 100)
ROI Realization Score = min(100, (actual_roi / promised_roi) × 100)
```

**Target Thresholds:**
- Time saved: 20+ hours/month
- Revenue increase: $50K+/year (customer-specific based on size)
- Efficiency: 10%+ improvement (more appointments per day)
- ROI: 100%+ of promised ROI (e.g., if promised 500%, actual should be 500%+)

---

### 3. Engagement Score (0-100, Weight: 20%)

**Metrics:**
- Support tickets (quantity, sentiment, resolution time)
- Feature requests (engaged customers suggest improvements)
- Referrals (happy customers refer others)
- Participation (community forum, webinars, events)

**Calculation:**
```
Engagement Score = (
  Support Sentiment Score × 0.30 +
  Feature Request Score × 0.20 +
  Referral Score × 0.30 +
  Participation Score × 0.20
)

Support Sentiment Score = (positive_tickets / total_tickets) × 100
Feature Request Score = min(100, (feature_requests / 2) × 100)
Referral Score = min(100, (referrals_given / 1) × 100)
Participation Score = (events_attended / events_invited) × 100
```

**Target Thresholds:**
- Support sentiment: 80%+ positive (thumbs up, positive feedback)
- Feature requests: 1+ per quarter (shows engagement)
- Referrals: 1+ referral (shows advocacy)
- Participation: 50%+ event attendance rate

---

### 4. Financial Score (0-100, Weight: 15%)

**Metrics:**
- Payment history (on-time payments, failed payments)
- Contract status (active, at risk, expired)
- Plan usage (under-using current plan, ready for upgrade)
- Payment method (credit card on file, auto-pay enabled)

**Calculation:**
```
Financial Score = (
  Payment History Score × 0.40 +
  Contract Status Score × 0.30 +
  Plan Usage Score × 0.20 +
  Payment Method Score × 0.10
)

Payment History Score = (on_time_payments / total_payments) × 100
Contract Status Score = active ? 100 : (at_risk ? 50 : 0)
Plan Usage Score = min(100, (usage / plan_limit) × 100)
Payment Method Score = (has_auto_pay ? 100 : (has_card_on_file ? 70 : 0))
```

**Target Thresholds:**
- Payment history: 100% on-time payments
- Contract status: Active subscription
- Plan usage: 70-90% (shows value, room for growth)
- Payment method: Auto-pay enabled

---

### 5. Support Score (0-100, Weight: 10%)

**Metrics:**
- Support ticket volume (quantity, trend)
- Ticket resolution time (fast resolution = satisfied)
- Ticket sentiment (positive vs. negative)
- Escalation rate (high escalation = frustrated)

**Calculation:**
```
Support Score = (
  Ticket Volume Score × 0.30 +
  Resolution Time Score × 0.30 +
  Ticket Sentiment Score × 0.30 +
  Escalation Rate Score × 0.10
)

Ticket Volume Score = max(0, 100 - (tickets_last_30_days × 10))
Resolution Time Score = (avg_resolution_time < 12_hours ? 100 : 50)
Ticket Sentiment Score = (positive_tickets / total_tickets) × 100
Escalation Rate Score = max(0, 100 - (escalations / tickets × 100))
```

**Target Thresholds:**
- Ticket volume: <3 tickets/month
- Resolution time: <12 hours average
- Ticket sentiment: 80%+ positive
- Escalation rate: <10% of tickets

---

### Risk Penalties (Subtracted from Total)

**Penalties:**
- Payment failure: -20 points
- 3+ support tickets in 7 days: -10 points
- No login in 14 days: -15 points
- Conversion rate <50% (below baseline): -10 points
- Contract renewal <30 days away: -10 points (if not renewed)

**Maximum Penalty:** -50 points (health score cannot go below 0)

---

## Churn Prediction Model

### Churn Risk Categories

**Low Risk (0-20%):**
- Health score: 80-100
- Action: Monitor, expansion opportunities

**Medium Risk (20-50%):**
- Health score: 50-79
- Action: Proactive outreach, optimization

**High Risk (50-80%):**
- Health score: 30-49
- Action: Intervention required, account manager call

**Critical Risk (80-100%):**
- Health score: 0-29
- Action: Emergency intervention, founder call

---

### Churn Prediction Factors

**Historical Churn Patterns:**
- Customers who churn typically show:
  1. Health score drops below 50 for 2+ weeks
  2. No login for 14+ days
  3. 3+ support tickets in 7 days (frustration)
  4. Payment failure (financial stress)
  5. Conversion rate drops >30% (not seeing value)

**Predictive Model:**
```
Churn Probability = (
  (100 - Health Score) / 100 × 0.50 +
  (days_since_last_login / 30) × 0.20 +
  (support_tickets_7d / 5) × 0.15 +
  (payment_failures / 2) × 0.10 +
  (conversion_drop / 0.30) × 0.05
)

Churn Risk = min(100, Churn Probability × 100)
```

---

## Intervention Triggers

### Automatic Triggers (Real-Time)

**Trigger 1: Health Score Drops Below 50**
- Action: Alert customer success manager
- Timeline: Within 4 hours
- Playbook: [Yellow Zone Intervention](#yellow-zone-intervention)

**Trigger 2: Health Score Drops Below 30**
- Action: Alert customer success manager + founder
- Timeline: Within 1 hour
- Playbook: [Red Zone Intervention](#red-zone-intervention)

**Trigger 3: No Login for 14 Days**
- Action: Send re-engagement email
- Timeline: Day 14, Day 21, Day 30
- Playbook: [Re-Engagement Sequence](#re-engagement-sequence)

**Trigger 4: Payment Failure**
- Action: Dunning sequence + customer success call
- Timeline: Day 1, Day 3, Day 7
- Playbook: [Payment Recovery](#payment-recovery)

**Trigger 5: 3+ Support Tickets in 7 Days**
- Action: Proactive outreach call
- Timeline: Within 24 hours
- Playbook: [Frustration Intervention](#frustration-intervention)

**Trigger 6: Conversion Rate Drops >30%**
- Action: Performance optimization call
- Timeline: Within 48 hours
- Playbook: [Performance Recovery](#performance-recovery)

---

## Intervention Playbooks

### Yellow Zone Intervention (Health Score: 50-79)

**Goal:** Restore health score to 80+ within 30 days

**Step 1: Assessment (Day 1)**
- Review health score components (identify weak areas)
- Check recent activity (logins, usage, support tickets)
- Identify root cause of score drop

**Step 2: Outreach (Day 1-2)**
- Email: "We noticed [specific issue]. Let's fix it together."
- Schedule 30-minute optimization call
- Offer resources (training, documentation)

**Step 3: Optimization Call (Day 3-5)**
- Review performance data together
- Identify specific issues
- Create action plan (specific, measurable, time-bound)
- Schedule follow-up in 14 days

**Step 4: Follow-Up (Day 14)**
- Review progress on action plan
- Adjust if needed
- Continue monitoring

**Step 5: Success Verification (Day 30)**
- Check health score (target: 80+)
- If improved: Celebrate, maintain monitoring
- If not improved: Escalate to Red Zone Intervention

---

### Red Zone Intervention (Health Score: 0-49)

**Goal:** Prevent churn, restore to 80+ within 14 days

**Step 1: Immediate Assessment (Day 0)**
- Founder/CEO notified immediately
- Full account review (all metrics, history, issues)
- Identify critical issues

**Step 2: Emergency Outreach (Day 0)**
- Founder/CEO calls customer within 4 hours
- Acknowledge issues
- Express commitment to fix
- Schedule emergency optimization session

**Step 3: Emergency Optimization (Day 1)**
- 60-minute deep dive session
- Identify all issues (technical, training, value)
- Create aggressive action plan
- Assign dedicated support engineer

**Step 4: Daily Check-Ins (Day 1-7)**
- Daily email/call updates
- Progress tracking
- Issue resolution
- Show immediate value

**Step 5: Intensive Support (Day 1-14)**
- Dedicated support engineer (24/7 response)
- Priority technical support
- Custom solutions if needed
- Whatever it takes

**Step 6: Recovery Verification (Day 14)**
- Check health score (target: 80+)
- Customer satisfaction survey
- If recovered: Maintain high-touch for 30 days
- If not recovered: Offer pause/discount, prevent cancellation

---

### Re-Engagement Sequence (No Login for 14+ Days)

**Email 1: Day 14**
```
Subject: We Miss You! Here's What You're Missing

Hi [Name],

We noticed you haven't logged in recently. Here's what's happening:

- [X] calls handled this month
- [Y] appointments booked
- $[Z] in after-hours revenue captured

Login to see your full dashboard: [link]

Is everything working well? If you're having issues, let's fix them together.

[Schedule call link]

Best,
[Customer Success Manager]
```

**Email 2: Day 21**
```
Subject: Quick Check-In - Everything Okay?

Hi [Name],

Just checking in - everything working well with Cobalt AI?

If you're having any issues, I'm here to help. Let's schedule a quick call: [link]

If everything is great, awesome! Login to see your latest metrics: [link]

Best,
[Customer Success Manager]
```

**Email 3: Day 30**
```
Subject: Last Check-In - Can We Help?

Hi [Name],

This is my last automated check-in. If you're not seeing value, let's talk.

Options:
1. Optimization call (fix what's not working) - [link]
2. Pause subscription (30-90 days, no charge) - [link]
3. Cancel (if it's not the right fit) - [link]

I want to make sure you're successful, whatever that looks like.

[Customer Success Manager]
```

---

### Payment Recovery (Payment Failure)

**Email 1: Day 1 (Payment Failed)**
```
Subject: Payment Failed - Update Your Card

Hi [Name],

Your payment failed. Update your card to avoid service interruption: [link]

If you're having financial difficulties, let's talk: [link]

[Update Card Button]
```

**Email 2: Day 3 (If Not Updated)**
```
Subject: Payment Still Failed - Service Will Pause

Hi [Name],

Your payment still hasn't been processed. Service will pause in 4 days.

Update your card now: [link]

Or schedule a call to discuss: [link]

[Update Card Button]
```

**Call: Day 5 (If Still Not Updated)**
- Customer success manager calls
- Understand situation
- Offer options: Payment plan, pause, discount

**Final Email: Day 7 (If Still Not Updated)**
```
Subject: Service Paused - Update Card to Resume

Hi [Name],

Service has been paused. Update your card to resume: [link]

If you want to cancel, let's talk: [link]

[Update Card Button]
```

---

### Frustration Intervention (3+ Support Tickets in 7 Days)

**Goal:** Resolve all issues, restore satisfaction

**Step 1: Immediate Assessment (Day 0)**
- Review all support tickets (identify patterns)
- Check for systemic issues
- Assign dedicated support engineer

**Step 2: Proactive Call (Day 1)**
- Customer success manager calls customer
- Apologize for frustration
- Acknowledge all issues
- Create resolution plan

**Step 3: Resolution (Day 1-3)**
- Dedicated support engineer fixes all issues
- Daily updates to customer
- Show progress

**Step 4: Follow-Up (Day 7)**
- Verify all issues resolved
- Customer satisfaction survey
- Offer compensation if warranted (discount, credit)

---

### Performance Recovery (Conversion Rate Drop >30%)

**Goal:** Restore conversion rate to baseline within 14 days

**Step 1: Analysis (Day 1)**
- Compare current vs. historical conversion rate
- Analyze call transcripts (identify drop-off points)
- Check pricing, scheduling, OTTO performance

**Step 2: Optimization Call (Day 2)**
- Share analysis with customer
- Identify root cause (pricing too high, scheduling issues, OTTO performance)
- Create optimization plan

**Step 3: Implementation (Day 2-7)**
- Adjust pricing (CAL agent optimization)
- Optimize scheduling (FLO agent settings)
- Improve OTTO greeting/flow
- Monitor daily

**Step 4: Verification (Day 14)**
- Check conversion rate (target: back to baseline)
- Review with customer
- Document learnings

---

## Health Dashboard

### Real-Time Health View

**For Each Customer:**
- Health Score: [Score] / 100 ([Green/Yellow/Red])
- Churn Risk: [%] (Low/Medium/High/Critical)
- Last Updated: [Timestamp]

**Component Breakdown:**
- Usage Score: [Score] / 100
- Value Score: [Score] / 100
- Engagement Score: [Score] / 100
- Financial Score: [Score] / 100
- Support Score: [Score] / 100

**Trend Indicators:**
- Health score trend (last 30 days): [Chart]
- Component trends: [Mini charts]

**Recent Activity:**
- Last login: [Date]
- Last support ticket: [Date]
- Last payment: [Date]
- Last optimization: [Date]

---

### Health Alerts (Daily)

**Red Zone Customers (0-49):**
- List all customers with health score <50
- Show days in red zone
- Show last intervention date
- Action required: [Intervention playbook]

**Yellow Zone Customers (50-79):**
- List all customers with health score 50-79
- Show trend (improving/declining)
- Action required: [Monitoring or outreach]

**At-Risk Indicators:**
- No login in 14+ days
- Payment failure
- 3+ support tickets in 7 days
- Conversion rate drop >30%

---

## Metrics & Reporting

### Weekly Health Review

**Metrics:**
- Average health score: [Score]
- Customers by tier: Green [Count], Yellow [Count], Red [Count]
- Churn risk distribution: Low [Count], Medium [Count], High [Count], Critical [Count]
- Interventions performed: [Count]
- Interventions successful: [Count] ([%])

**Top Risks:**
- Customers most at risk (top 10)
- Common risk factors (payment failure, low usage, etc.)
- Intervention recommendations

---

### Monthly Health Report

**Overall Health:**
- Average health score: [Score] (trend: up/down)
- Customers in green zone: [%] (target: 70%+)
- Customers in yellow zone: [%] (target: 20-25%)
- Customers in red zone: [%] (target: <5%)

**Churn Prevention:**
- Churn predictions: [Count] (high risk customers)
- Interventions performed: [Count]
- Interventions successful: [Count] ([%])
- Actual churn: [Count] ([%] monthly churn rate)

**Component Analysis:**
- Average usage score: [Score]
- Average value score: [Score]
- Average engagement score: [Score]
- Average financial score: [Score]
- Average support score: [Score]

**Action Items:**
- Systemic issues identified
- Process improvements needed
- Training gaps identified

---

**Customer Health Scoring System Complete**  
**Status: Production-Ready - Ready for Week 1 Deployment**  
**Target: Predict and prevent 60%+ of churn**



