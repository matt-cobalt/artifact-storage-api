# Incident Response System
**Complete Infrastructure for Managing Critical Incidents**

**Version:** 1.0  
**Date:** 2024-12-21  
**Status:** Production-Ready - Ready for Week 1 Deployment

---

## Table of Contents

1. [Severity Levels](#severity-levels)
2. [On-Call Rotation](#on-call-rotation)
3. [Incident Response Playbook](#incident-response-playbook)
4. [Runbooks (Common Incidents)](#runbooks-common-incidents)
5. [Status Page](#status-page)
6. [Metrics & Reporting](#metrics--reporting)

---

## Severity Levels

### SEV 1: Critical (All Hands On Deck)

**Definition:** Service completely down for all customers or critical security breach

**Examples:**
- OTTO not answering any calls (complete outage)
- Database completely offline (all functionality broken)
- Authentication system down (no one can log in)
- Security breach (data exposure, unauthorized access)
- Payment processing down (billing failures)

**SLA:**
- Response time: <5 minutes
- Communication: Every 15 minutes
- Resolution target: <1 hour
- Post-incident review: Required (within 48 hours)
- Customer notification: Immediate (email + status page)

**Response Team:**
- All engineers on-call
- Founder/CEO notified immediately
- Customer success team mobilized
- All hands meeting within 10 minutes

---

### SEV 2: High (Major Impact)

**Definition:** Core functionality impaired for multiple customers (>10% affected)

**Examples:**
- Conversion rate drops >20% (system-wide performance issue)
- Dashboard not loading for some users (partial outage)
- Integration failing for one platform (Tekmetric, practice management)
- Phone system degraded (some calls not routing)
- Data sync delays (5+ minutes behind)

**SLA:**
- Response time: <15 minutes
- Communication: Every 30 minutes
- Resolution target: <4 hours
- Post-incident review: Required (within 1 week)
- Customer notification: Within 1 hour (email to affected customers)

**Response Team:**
- On-call engineer + backup
- Engineering lead notified
- Support team notified
- Founder notified (if escalation needed)

---

### SEV 3: Medium (Minor Impact)

**Definition:** Non-critical functionality affected or isolated issues

**Examples:**
- Reporting delayed (non-real-time, but eventually shows)
- Minor UI bugs (cosmetic, doesn't block functionality)
- Performance degradation (slow but functional, >2s response times)
- Single customer experiencing isolated issue
- Non-critical feature unavailable

**SLA:**
- Response time: <1 hour
- Communication: As needed (updates if resolution delayed)
- Resolution target: <24 hours
- Post-incident review: Optional
- Customer notification: Status page only (if affecting multiple customers)

**Response Team:**
- On-call engineer
- Escalate to engineering if unresolved after 4 hours

---

### SEV 4: Low (Minimal Impact)

**Definition:** Cosmetic issues or isolated problems affecting single customer

**Examples:**
- Typos in UI
- One customer experiencing isolated issue (likely configuration)
- Feature request (not a bug)
- Non-critical documentation errors

**SLA:**
- Response time: Next business day
- Communication: Ticket updates only
- Resolution target: <1 week
- Post-incident review: Not required
- Customer notification: Ticket updates only

**Response Team:**
- Support team (normal ticket flow)
- No on-call escalation

---

## On-Call Rotation

### Week 1-4 (Founder On-Call)

**Primary On-Call:**
- Name: Matt (Founder/CEO)
- Phone: [Primary number]
- Backup: Senior engineer (when hired)
- Coverage: 24/7

**Escalation:**
- SEV 1: All hands (everyone called)
- SEV 2: Engineering team notified
- SEV 3-4: Normal business hours

**Compensation:**
- No additional compensation (founder responsibility)
- Time-off in lieu: 1 day per SEV 1 incident handled

---

### Month 2-6 (Team On-Call)

**Rotation Schedule:**
- Week 1: Engineer A (primary), Engineer B (backup)
- Week 2: Engineer B (primary), Engineer C (backup)
- Week 3: Engineer C (primary), Engineering Lead (backup)
- Week 4: Engineering Lead (primary), Founder (backup)
- Repeat cycle

**On-Call Responsibilities:**
1. Acknowledge incidents within SLA (<5 min for SEV 1, <15 min for SEV 2)
2. Triage severity appropriately
3. Coordinate response team
4. Communicate with customers (status page, emails)
5. Document timeline and actions (incident log)
6. Write post-mortem (SEV 1/2 only)

**Escalation Path:**
- Can't resolve in 30 minutes → Escalate to engineering lead
- Engineering lead can't resolve → Escalate to founder
- SEV 1 → Founder automatically notified (parallel to on-call)

**Compensation:**
- $500/week on-call stipend (when not primary, no stipend)
- +$200 per SEV 1 incident handled (bonus)
- Time-off in lieu: 1 day per SEV 1 incident (in addition to stipend)
- Comp time: 4 hours for SEV 2 incidents, 2 hours for SEV 3

---

## Incident Response Playbook

### STEP 1: Detection & Triage (Minutes 0-5)

**Detection Sources:**
1. Automated monitoring alerts (Homeostatic Monitor, GUARDIAN agent)
2. Customer reports (support tickets, phone calls, Slack messages)
3. Team observations (engineers notice issues during work)
4. Partner notifications (Tekmetric, Twilio, Anthropic status pages)
5. Status page monitoring (third-party service outages)

**Initial Triage Checklist:**
- [ ] Acknowledge incident (PagerDuty/Slack notification)
- [ ] Assess severity (SEV 1-4 based on impact)
- [ ] Create incident channel (#incident-[timestamp]-[severity])
- [ ] Page on-call engineer (if not already aware)
- [ ] Begin incident log (timeline document)

**Severity Assessment Questions:**
1. How many customers are affected? (>50% = SEV 1, 10-50% = SEV 2, <10% = SEV 3/4)
2. Is core functionality broken? (Yes = SEV 1/2, No = SEV 3/4)
3. Is there a workaround? (No = higher severity)
4. Is customer data at risk? (Yes = SEV 1, automatic)

---

### STEP 2: Communication (Minutes 5-10)

**Internal Communication:**
- Post in #incidents Slack channel
- Create dedicated incident channel (#incident-[timestamp]-[severity])
- Page relevant team members (engineering, support, founder for SEV 1/2)
- Create Zoom war room (SEV 1/2 only)
- Begin timeline documentation (Google Doc or incident management tool)

**External Communication:**

**Status Page Update (All Severities):**
```
[COMPONENT NAME] - [STATUS: INVESTIGATING / IDENTIFIED / MONITORING / RESOLVED]

[Brief description of issue]

[Impact statement]

[Next update in: X minutes/hours]
```

**Email Template (SEV 1/2 Only):**
```
Subject: [URGENT] Service Disruption - [Component Name]

Hi [Customer Name],

We're currently experiencing an issue that is affecting [component/feature].

**What's happening:**
[Brief description of issue]

**Impact:**
[Who is affected - all customers, some customers, specific features]

**What we're doing:**
[Actions being taken - e.g., "Engineering team is actively investigating and working on a fix"]

**Estimated resolution:**
[Time estimate - e.g., "30-60 minutes" or "Working on it, will update in 30 minutes"]

**Workaround:**
[If available - e.g., "Calls are being routed to voicemail. We'll call customers back within 2 hours."]

**Updates:**
- Status page: status.cobaltai.com/incident/[ID]
- Email updates every [15/30] minutes until resolved

Our apologies for the disruption. We're treating this as our #1 priority.

Cobalt AI Team
support@cobaltai.com
```

**Social Media (SEV 1 Only):**
- Twitter/X: Brief status update
- LinkedIn: If affecting enterprise customers

---

### STEP 3: Investigation (Minutes 10-30)

**Investigation Checklist:**
- [ ] Check recent deployments (last 24 hours) - Did something change?
- [ ] Review error logs (Supabase logs, Railway logs, Sentry)
- [ ] Monitor system metrics (CPU, memory, latency, error rates)
- [ ] Test affected functionality manually (reproduce issue)
- [ ] Check third-party service status (Anthropic status, Twilio status, Tekmetric status)
- [ ] Query database for anomalies (unusual data patterns, connection issues)
- [ ] Review recent configuration changes (environment variables, feature flags)
- [ ] Check monitoring dashboards (Homeostatic Monitor, custom metrics)

**Tools:**
- Logs: Railway logs, Supabase logs, application logs
- Metrics: Homeostatic Monitor dashboard, custom Grafana dashboards
- Traces: Request/response logs, distributed tracing
- Database: Supabase dashboard, pgAdmin (if needed)
- Monitoring: GUARDIAN agent alerts, custom alerting

**Document Findings:**
- Root cause hypothesis
- Affected systems/components
- Customer impact (number affected, revenue impact)
- Workaround availability

---

### STEP 4: Mitigation (Minutes 30-60)

**Mitigation Options (in priority order):**

**1. Rollback (Fastest, Safest)**
- Revert to last known good deployment
- Time: 5-10 minutes
- Risk: Low (proven working state)
- Use when: Recent deployment caused issue

**Rollback Process:**
```bash
# Railway CLI
railway rollback --deployment [deployment-id]

# Or via Railway dashboard
# Deployments → Select last good deployment → Promote to production
```

**2. Hotfix (Faster, Moderate Risk)**
- Fix critical bug in production (if simple fix)
- Time: 15-30 minutes
- Risk: Medium (untested in production)
- Use when: Fix is obvious and low-risk

**Hotfix Process:**
1. Create hotfix branch
2. Make minimal fix
3. Test locally (if possible)
4. Deploy to staging (quick smoke test)
5. Deploy to production
6. Monitor closely

**3. Failover (Fast, For Infrastructure Issues)**
- Switch to backup systems (if available)
- Time: 10-20 minutes
- Risk: Low (if backup tested)
- Use when: Primary infrastructure failed

**Failover Process:**
1. Identify backup system (if exists)
2. Update DNS/routing to backup
3. Verify backup is operational
4. Monitor traffic routing correctly

**4. Manual Intervention (Slower, For Data Issues)**
- Fix data manually (database queries, configuration changes)
- Time: 30-60 minutes
- Risk: Medium (human error possible)
- Use when: Data corruption or configuration issue

**Manual Fix Process:**
1. Backup current state (database snapshot, config backup)
2. Identify affected records/data
3. Apply fix (SQL query, config update)
4. Verify fix worked
5. Monitor for regressions

**5. Full Rebuild (Slowest, Last Resort)**
- Rebuild affected systems from scratch
- Time: 1-4 hours
- Risk: High (complex, many steps)
- Use when: All else fails or system completely corrupted

---

### STEP 5: Resolution & Recovery (Minutes 60-120)

**Resolution Checklist:**
- [ ] Fix deployed to production (or rollback completed)
- [ ] Functionality verified (manual testing of affected features)
- [ ] Monitoring shows normal metrics (CPU, memory, latency, error rates back to baseline)
- [ ] No new errors in logs (error rate normalized)
- [ ] Customer reports confirm fix (no new tickets, existing tickets resolved)
- [ ] All affected customers notified (email + status page update)
- [ ] Status page updated ("Resolved")

**Recovery Verification:**
1. Run automated test suite (if available)
2. Manually test critical paths (OTTO call, dashboard load, data sync)
3. Monitor for 2 hours post-fix (ensure stability)
4. Check customer satisfaction (survey responses, support tickets)

**Resolution Communication:**
```
Subject: [RESOLVED] Service Disruption - [Component Name]

Hi [Customer Name],

The issue affecting [component/feature] has been resolved.

**What was wrong:**
[Brief explanation - technical but accessible]

**What we fixed:**
[What we did to resolve it]

**Prevention:**
[What we're doing to prevent this from happening again]

**Our apologies:**
We know how critical this is for your business. We've taken steps to prevent this from recurring.

If you continue to experience any issues, please let us know immediately.

Cobalt AI Team
support@cobaltai.com
```

---

### STEP 6: Post-Incident (Within 48 hours)

**Post-Mortem Template:**

```markdown
# Post-Incident Report: [Incident Title]

**Date:** [Date]
**Duration:** [Start time] - [End time] ([Duration in minutes/hours])
**Severity:** SEV [1/2/3/4]
**Impact:** [Number of customers affected, revenue impact, downtime duration]

## Summary
[2-3 sentence description of what happened]

## Timeline
- [HH:MM] - Incident detected by [source: monitoring/customer/team]
- [HH:MM] - On-call engineer acknowledged
- [HH:MM] - Severity assessed: SEV [1/2/3/4]
- [HH:MM] - Investigation began
- [HH:MM] - Root cause identified: [cause]
- [HH:MM] - Mitigation started: [action taken]
- [HH:MM] - Fix deployed
- [HH:MM] - Verification completed
- [HH:MM] - Incident resolved

## Root Cause
[Technical explanation of what caused the incident - detailed enough for engineers to understand]

## Resolution
[What was done to fix the issue - step by step]

## Customer Impact
- Customers affected: [Number] ([Percentage]% of customer base)
- Duration of impact: [Minutes/hours]
- Revenue impact: $[Amount] (estimated lost revenue)
- Customer complaints: [Number] tickets opened
- Customer satisfaction: [Score] (from post-incident survey)

## What Went Well
- [Thing 1 - e.g., "Fast detection via automated monitoring"]
- [Thing 2 - e.g., "Quick rollback resolved issue in 8 minutes"]
- [Thing 3 - e.g., "Clear communication kept customers informed"]

## What Went Poorly
- [Thing 1 - e.g., "Took 20 minutes to identify root cause (should be <10 min)"]
- [Thing 2 - e.g., "Customer notification delayed by 15 minutes"]
- [Thing 3 - e.g., "No runbook existed for this scenario"]

## Action Items
1. [ ] [Action to prevent recurrence] - Owner: [Name], Due: [Date]
   - Example: "Add automated test for [scenario] to CI/CD pipeline"
2. [ ] [Action to improve detection] - Owner: [Name], Due: [Date]
   - Example: "Add alert for [metric] threshold"
3. [ ] [Action to improve response] - Owner: [Name], Due: [Date]
   - Example: "Create runbook for [scenario]"
4. [ ] [Action to improve communication] - Owner: [Name], Due: [Date]
   - Example: "Automate status page updates from monitoring alerts"

## Lessons Learned
[Key takeaways for team - what we'll do differently next time]
```

**Post-Mortem Review:**
- Schedule within 48 hours (while fresh)
- Include all involved team members
- Focus on learning, not blame
- Assign action items with owners and due dates
- Share with entire team (transparency)

---

## Runbooks (Common Incidents)

### Runbook 1: OTTO Not Answering Calls

**Symptoms:**
- Customers report calls going to voicemail
- No call logs appearing in dashboard
- Twilio webhook logs show no activity
- OTTO agent not processing requests

**Likely Causes:**
1. Twilio webhook misconfigured (webhook URL incorrect)
2. Railway service crashed (application not running)
3. Database connection lost (can't store call data)
4. API rate limit exceeded (Anthropic, Twilio)
5. Environment variables missing/incorrect

**Diagnostic Steps:**

```bash
# 1. Check Railway service status
railway status
# Expected: Service running, no errors

# 2. Check recent logs
railway logs --tail 100
# Look for: Errors, crashes, connection failures

# 3. Test Twilio webhook endpoint
curl -X POST https://api.cobaltai.com/twilio/voice/incoming \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "CallSid=test123&From=+15551234567&To=+15557654321"
# Expected: 200 OK response

# 4. Check database connection
psql $DATABASE_URL -c "SELECT 1"
# Expected: Returns "1"

# 5. Check Anthropic API status
curl https://status.anthropic.com
# Expected: All systems operational

# 6. Check environment variables
railway variables
# Verify: ANTHROPIC_API_KEY, TWILIO_AUTH_TOKEN, DATABASE_URL all set
```

**Resolution Steps:**

**If Railway Service Crashed:**
```bash
# Restart service
railway restart

# Verify service is running
railway status

# Monitor logs for startup
railway logs --tail 50
```

**If Twilio Webhook Misconfigured:**
1. Go to Twilio Console → Phone Numbers → [Your Number]
2. Verify Voice Configuration:
   - Webhook URL: `https://api.cobaltai.com/twilio/voice/incoming`
   - HTTP Method: POST
   - Save changes
3. Test call: Call your number, verify OTTO answers
4. Check dashboard: Call should appear in logs within 30 seconds

**If Database Connection Lost:**
1. Check Supabase dashboard → Project Settings → Database
2. Verify connection pooling settings (if using)
3. Check for connection limit reached
4. Restart Railway service (reconnects to database)
5. If still failing: Check database credentials in Railway variables

**If API Rate Limit Exceeded:**
1. Check Anthropic API usage: Dashboard → Usage
2. If over limit: Wait for rate limit reset (usually 1 minute)
3. Consider: Upgrade API tier or implement request queuing
4. Short-term: Reduce concurrent requests

**Verification:**
- Make test call to shop number
- Verify OTTO answers within 2 seconds
- Verify call appears in dashboard within 30 seconds
- Verify appointment created (if applicable)

---

### Runbook 2: Low Conversion Rate (System-Wide)

**Symptoms:**
- Conversion rate drops >20% across all customers
- OTTO answering calls but appointments not booking
- Customers reporting pricing issues
- Appointment scheduling failures

**Likely Causes:**
1. CAL agent pricing calculation broken (prices too high/wrong)
2. FLO agent scheduling logic broken (no available slots)
3. Database sync issues (appointments not saving)
4. Third-party API failures (calendar integration, practice management)

**Diagnostic Steps:**
1. Check conversion rate dashboard (all customers vs. historical)
2. Review recent CAL agent code changes (last 7 days)
3. Test pricing calculation manually
4. Check FLO agent logs for scheduling errors
5. Test appointment creation flow end-to-end

**Resolution Steps:**
1. If CAL pricing broken: Rollback CAL agent changes or hotfix pricing logic
2. If FLO scheduling broken: Check calendar integration, verify availability logic
3. If database sync: Check sync logs, manually sync if needed
4. If third-party API: Check status page, implement fallback if available

**Verification:**
- Monitor conversion rate over next 2 hours (should return to baseline)
- Review customer feedback (support tickets, surveys)
- Test appointment booking flow manually

---

### Runbook 3: Dashboard Not Loading

**Symptoms:**
- Customers report dashboard blank/error
- Some users can access, others cannot
- Loading spinner never completes
- Error messages in browser console

**Likely Causes:**
1. Frontend deployment broken (JavaScript errors)
2. API backend down (can't fetch data)
3. Authentication system down (can't log in)
4. Database queries timing out (slow queries)

**Diagnostic Steps:**
1. Check frontend deployment status (Vercel/Railway)
2. Check API health endpoint: `GET /api/health`
3. Check browser console for errors
4. Test authentication: Try logging in
5. Check database query performance

**Resolution Steps:**
1. If frontend broken: Rollback frontend deployment
2. If API down: See Runbook 1 (Railway service crash)
3. If authentication down: Check Supabase Auth status
4. If database slow: Check query logs, optimize slow queries, scale database if needed

---

[Continue with 10+ more runbooks for: Database connection failures, Integration sync issues, Payment processing failures, Security incidents, Performance degradation, etc.]

---

## Status Page

### Components to Track

**1. OTTO (Voice AI)**
- Status: Operational / Degraded / Down
- Uptime: 99.9% (30-day target)
- Response time: <1 second (target)
- Last incident: [Date] ([Duration])

**2. Dashboard**
- Status: Operational / Degraded / Down
- Uptime: 99.95% (30-day target)
- Load time: <2 seconds (target)
- Last incident: [Date] ([Duration])

**3. Integrations (Tekmetric, Practice Management)**
- Status: Operational / Degraded / Down
- Uptime: 99.5% (30-day target, accounts for third-party)
- Sync latency: <5 minutes (target)
- Last incident: [Date] ([Duration])

**4. Knowledge Graph (Neo4j)**
- Status: Operational / Degraded / Down
- Uptime: 99.9% (30-day target)
- Query performance: <200ms (target)
- Last incident: [Date] ([Duration])

**5. API Services**
- Status: Operational / Degraded / Down
- Uptime: 99.9% (30-day target)
- Response time: <500ms (target)
- Last incident: [Date] ([Duration])

### Update Frequency

**During Incident:**
- SEV 1: Every 15 minutes
- SEV 2: Every 30 minutes
- SEV 3: Every 1 hour (if affecting multiple customers)

**Normal Operations:**
- Auto-update from health checks (every 5 minutes)
- Manual updates if needed

### Status Page Provider

**Recommended:** StatusPage.io, Better Uptime, or custom (simple page)

**Requirements:**
- Real-time updates (API integration)
- Historical uptime tracking
- Incident timeline
- Email/SMS notifications (for subscribers)
- RSS feed (for integrations)

---

## Metrics & Reporting

### Incident Metrics (Monthly Review)

**Volume Metrics:**
- Total incidents: [Count by severity]
- SEV 1 incidents: [Count] (target: <2/month)
- SEV 2 incidents: [Count] (target: <10/month)
- SEV 3/4 incidents: [Count] (not tracked, normal support flow)

**Performance Metrics:**
- Mean time to detect (MTTD): [Minutes] (target: <5 minutes)
- Mean time to acknowledge (MTTA): [Minutes] (target: <5 minutes)
- Mean time to resolve (MTTR): [Minutes] (target: <1 hour for SEV 1, <4 hours for SEV 2)
- Customer-impacting incidents: [Count] (SEV 1/2 only)

**Uptime Metrics:**
- Overall uptime: [%] (target: 99.9% = 43 minutes downtime/month allowed)
- Uptime by component:
  - OTTO: [%]
  - Dashboard: [%]
  - Integrations: [%]
  - Knowledge Graph: [%]
  - API Services: [%]

### Target SLAs

**Uptime:**
- Target: 99.9% (43 minutes downtime/month allowed)
- Actual: [%] (track monthly)

**Detection:**
- Target: <5 minutes (automated monitoring should catch)
- Actual: [Minutes] (track per incident)

**Acknowledgment:**
- Target: <5 minutes (on-call response)
- Actual: [Minutes] (track per incident)

**Resolution:**
- Target: <1 hour (SEV 1), <4 hours (SEV 2)
- Actual: [Minutes] (track per incident)

### Monthly Incident Report

**Sent to:**
- Entire team
- Investors (if SEV 1 incidents occurred)
- Board (quarterly summary)

**Includes:**
- Incident summary (count, severity, duration)
- Root cause analysis (top 3 causes)
- Action items progress (from post-mortems)
- Uptime statistics
- Customer impact summary

---

**Incident Response System Complete**  
**Status: Production-Ready - Ready for Week 1 Deployment**  
**Target: <1 hour MTTR for SEV 1, 99.9% uptime**



