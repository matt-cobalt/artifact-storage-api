# Cobalt AI - Week 1 Deployment Playbook
**150 Locations, 2 Verticals, 7 Days**

**Version:** 1.0  
**Date:** 2025-12-20  
**Status:** Production-Ready - Ready for Week 1 Execution

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Day-by-Day Execution Plan](#day-by-day-execution-plan)
3. [Per-Location Deployment Checklist](#per-location-deployment-checklist)
4. [Resource Requirements](#resource-requirements)
5. [Risk Mitigation](#risk-mitigation)
6. [Success Metrics](#success-metrics)

---

## Deployment Overview

### Week 1 Goals

**Total Locations: 150**
- Automotive: 100 locations
- Medical: 50 locations

**Verticals: 2**
- Auto Intel GTP (automotive vertical)
- Cobalt Medical (medical vertical)

**Timeline: 7 days (Monday-Friday + Weekend)**
- Day 1-2: Onboarding (20 locations/day)
- Day 3-4: Integration & Training (25 locations/day)
- Day 5-7: Validation & Go-Live (50 locations total)

### Deployment Capacity

**Resources:**
- 1 Deployment Engineer (founder/CTO)
- 2 Customer Success Managers (onboarding, training)
- 1 Support Engineer (integration troubleshooting)
- Automated deployment scripts (80% of work automated)

**Capacity:**
- Parallel deployments: 10 locations simultaneously
- Sequential batches: 50 locations/day (with parallel work)
- Total Week 1 capacity: 150 locations (target achieved)

---

## Day-by-Day Execution Plan

### DAY 1 (Monday): Onboarding - Clinics/Shops 1-20

**Objectives:**
- Complete legal setup (BAA agreements for medical)
- Collect integration credentials (Tekmetric, EHR systems)
- Set up customer accounts
- Schedule training sessions

**Morning (9 AM - 12 PM):**

**Batch 1: Medical Clinics 1-10 (Automated)**
- [ ] Send BAA agreement via DocuSign (automated email)
- [ ] Collect practice management system credentials (secure form)
- [ ] Create customer accounts in platform (automated)
- [ ] Generate API keys for integrations
- [ ] Send welcome email with next steps

**Batch 2: Automotive Shops 1-10 (Automated)**
- [ ] Send service agreement via DocuSign (automated email)
- [ ] Collect Tekmetric API credentials (secure form)
- [ ] Create customer accounts in platform (automated)
- [ ] Generate API keys for integrations
- [ ] Send welcome email with next steps

**Afternoon (1 PM - 5 PM):**

**Training Sessions (Remote, 2 hours each):**
- [ ] Medical Clinic Training (10 clinics): 1 PM - 3 PM
  - HIPAA compliance overview
  - Dashboard navigation
  - Integration management
  - Best practices
- [ ] Automotive Shop Training (10 shops): 3 PM - 5 PM
  - Dashboard navigation
  - OTTO capabilities
  - Integration management
  - Best practices

**Evening (5 PM - 7 PM):**

**Status Review:**
- [ ] Review completion rates (target: 100%)
- [ ] Identify blockers or issues
- [ ] Schedule Day 2 integrations for completed locations
- [ ] Update deployment dashboard

**Day 1 Success Criteria:**
- ✅ 20 locations onboarded (100% target)
- ✅ All legal agreements signed (medical: BAA, auto: service agreement)
- ✅ All training completed
- ✅ Integration credentials collected
- ✅ Day 2 integration schedule confirmed

---

### DAY 2 (Tuesday): Integration Setup - Clinics/Shops 1-20

**Objectives:**
- Connect integrations (Tekmetric, EHR systems)
- Test data sync
- Validate system connections
- Prepare for Day 3 phone porting

**Morning (9 AM - 12 PM):**

**Batch 1: Medical Clinics 1-10 (Integration)**
- [ ] Connect practice management system API
- [ ] Test patient data sync (pull 10 test records)
- [ ] Connect insurance clearinghouse API
- [ ] Test eligibility verification (test patient)
- [ ] Connect Twilio (phone system)
- [ ] Test phone integration (test call)

**Batch 2: Automotive Shops 1-10 (Integration)**
- [ ] Connect Tekmetric API
- [ ] Test customer/vehicle data sync (pull 10 test records)
- [ ] Connect Twilio (phone system)
- [ ] Test phone integration (test call)
- [ ] Connect Stripe (payment processing, if applicable)

**Afternoon (1 PM - 5 PM):**

**Validation & Testing:**
- [ ] Run integration test suite for all 20 locations
- [ ] Verify data sync accuracy (compare 10 records)
- [ ] Test phone routing (make test calls)
- [ ] Validate error handling (simulate failures)
- [ ] Generate validation reports

**Issues Resolution:**
- [ ] Identify integration failures
- [ ] Troubleshoot (API credentials, permissions, etc.)
- [ ] Retest until passing
- [ ] Document any custom configurations

**Evening (5 PM - 7 PM):**

**Status Review:**
- [ ] Integration completion rate (target: 100%)
- [ ] Test results (target: all passing)
- [ ] Schedule Day 3 phone porting for validated locations
- [ ] Update deployment dashboard

**Day 2 Success Criteria:**
- ✅ 20 locations integrated (100% target)
- ✅ All integrations tested and validated
- ✅ Data sync working correctly
- ✅ Phone routing configured
- ✅ Day 3 phone porting schedule confirmed

---

### DAY 3 (Wednesday): Phone Porting & Training - Clinics/Shops 1-20

**Objectives:**
- Port phone numbers to OTTO (M-OTTO for medical, OTTO for auto)
- Complete staff training
- Conduct validation calls
- Prepare for go-live

**Morning (9 AM - 12 PM):**

**Phone Porting (Automated Process):**
- [ ] Medical Clinics 1-10: Port phone numbers to M-OTTO
  - Request porting via Twilio API
  - Configure call routing (OTTO answers first)
  - Set up fallback (transfer to staff if needed)
  - Test routing (make test calls)
- [ ] Automotive Shops 1-10: Port phone numbers to OTTO
  - Request porting via Twilio API
  - Configure call routing
  - Set up fallback
  - Test routing

**Validation Calls:**
- [ ] Make test calls to each location
- [ ] Verify OTTO answers correctly
- [ ] Test conversation flow (schedule appointment, quote price, etc.)
- [ ] Verify data appears in dashboard
- [ ] Test fallback (transfer to staff)

**Afternoon (1 PM - 5 PM):**

**Advanced Training (Remote, 1 hour each):**
- [ ] Medical Clinics 1-10: Advanced Features (1 PM - 2 PM)
  - M-GUARDIAN monitoring
  - HIPAA compliance checks
  - Patient rights management
  - Reporting and analytics
- [ ] Automotive Shops 1-10: Advanced Features (2 PM - 3 PM)
  - GUARDIAN monitoring
  - Agent coordination (OTTO + Squad)
  - Reporting and analytics
  - Custom configurations

**Q&A Sessions (3 PM - 5 PM):**
- [ ] Medical Clinics: Q&A and troubleshooting
- [ ] Automotive Shops: Q&A and troubleshooting
- [ ] Address specific questions
- [ ] Document common issues

**Evening (5 PM - 7 PM):**

**Pre-Go-Live Checklist:**
- [ ] All integrations validated
- [ ] Phone routing tested
- [ ] Staff trained
- [ ] Monitoring active (GUARDIAN/M-GUARDIAN)
- [ ] Support channels confirmed
- [ ] Go-live authorization received

**Day 3 Success Criteria:**
- ✅ 20 locations phone ported (100% target)
- ✅ All validation calls passed
- ✅ Staff training completed
- ✅ Go-live ready (all checks passed)

---

### DAY 4 (Thursday): Go-Live + Onboarding Batch 2 - Locations 21-50

**Objectives:**
- Go-live for Locations 1-20
- Monitor initial usage
- Onboard Locations 21-50
- Begin integration setup for Locations 21-50

**Morning (9 AM - 12 PM):**

**Go-Live for Locations 1-20:**
- [ ] Activate production mode (flip switch in dashboard)
- [ ] Notify locations: "You're live! OTTO is answering your phones"
- [ ] Enable monitoring alerts (GUARDIAN/M-GUARDIAN)
- [ ] Start real-time monitoring dashboard
- [ ] Watch first calls come in (celebrate wins!)

**Monitoring:**
- [ ] Track first calls per location
- [ ] Monitor conversion rates (should see 80%+ immediately)
- [ ] Check for errors or issues
- [ ] Respond to support requests (if any)

**Afternoon (1 PM - 5 PM):**

**Batch 2 Onboarding: Locations 21-50**

**Medical Clinics 21-35:**
- [ ] Send BAA agreements
- [ ] Collect credentials
- [ ] Create accounts
- [ ] Schedule training (Day 5)

**Automotive Shops 21-35:**
- [ ] Send service agreements
- [ ] Collect Tekmetric credentials
- [ ] Create accounts
- [ ] Schedule training (Day 5)

**Evening (5 PM - 7 PM):**

**Day 1 Go-Live Review:**
- [ ] Review metrics for Locations 1-20
  - Calls answered: [target: 50+ calls total]
  - Conversion rate: [target: 80%+]
  - After-hours calls: [target: 10+ calls]
  - Issues: [target: <2 issues]
- [ ] Address any issues
- [ ] Celebrate wins
- [ ] Prepare Day 5 schedule

**Day 4 Success Criteria:**
- ✅ Locations 1-20 go-live successful
- ✅ 50+ calls answered across all locations
- ✅ 80%+ conversion rate
- ✅ Locations 21-50 onboarded
- ✅ No critical issues

---

### DAY 5 (Friday): Integration Batch 2 + Validation - Locations 21-50

**Objectives:**
- Integrate Locations 21-50
- Validate all integrations
- Train Locations 21-50
- Prepare for Weekend go-live

**Morning (9 AM - 12 PM):**

**Integration Setup: Locations 21-50**
- [ ] Medical Clinics 21-35: Connect EHR, clearinghouse, phone
- [ ] Automotive Shops 21-35: Connect Tekmetric, phone
- [ ] Run integration tests
- [ ] Validate data sync

**Afternoon (1 PM - 5 PM):**

**Training & Validation:**
- [ ] Medical Clinics 21-35: Training (1 PM - 2:30 PM)
- [ ] Automotive Shops 21-35: Training (2:30 PM - 4 PM)
- [ ] Phone porting for Locations 21-50
- [ ] Validation calls for Locations 21-50
- [ ] Pre-go-live checklist

**Evening (5 PM - 7 PM):**

**Weekend Go-Live Preparation:**
- [ ] Review all 50 locations (1-50)
- [ ] Confirm go-live readiness
- [ ] Schedule Weekend monitoring
- [ ] Prepare on-call support (if needed)

**Day 5 Success Criteria:**
- ✅ Locations 21-50 integrated and validated
- ✅ All training completed
- ✅ All locations ready for Weekend go-live
- ✅ Locations 1-20 performing well (ongoing monitoring)

---

### DAY 6-7 (Weekend): Go-Live Batch 2 + Onboarding Batch 3 - Locations 51-150

**DAY 6 (Saturday):**

**Morning:**
- [ ] Go-live for Locations 21-50 (activate production mode)
- [ ] Monitor Weekend calls (after-hours capture is critical)
- [ ] Onboard Locations 51-100 (legal, credentials, accounts)

**Afternoon:**
- [ ] Integrate Locations 51-75 (parallel batches)
- [ ] Review Weekend performance (Locations 1-50)

**DAY 7 (Sunday):**

**Morning:**
- [ ] Integrate Locations 76-100
- [ ] Onboard Locations 101-150 (legal, credentials, accounts)

**Afternoon:**
- [ ] Integrate Locations 101-150 (parallel batches)
- [ ] Prepare for Week 2 (training, validation, go-live)

**Weekend Success Criteria:**
- ✅ Locations 21-50 go-live successful
- ✅ 100+ Weekend calls answered (after-hours capture)
- ✅ Locations 51-150 onboarded and integrated
- ✅ Ready for Week 2 training and go-live

---

## Per-Location Deployment Checklist

### Pre-Deployment (Day 0)

- [ ] Legal agreement signed (BAA for medical, service agreement for auto)
- [ ] Integration credentials collected (Tekmetric API key, EHR credentials)
- [ ] Customer account created in platform
- [ ] API keys generated
- [ ] Welcome email sent

### Integration (Day 1-2)

**Medical:**
- [ ] Practice management system connected (API credentials verified)
- [ ] Patient data sync tested (pull 10 test records, verify accuracy)
- [ ] Insurance clearinghouse connected (API credentials verified)
- [ ] Eligibility verification tested (test patient)
- [ ] Phone system connected (Twilio configuration)
- [ ] Phone routing tested (test call)

**Automotive:**
- [ ] Tekmetric API connected (API key verified)
- [ ] Customer/vehicle data sync tested (pull 10 test records)
- [ ] Phone system connected (Twilio configuration)
- [ ] Phone routing tested (test call)
- [ ] Payment processing connected (Stripe, if applicable)

### Training (Day 2-3)

- [ ] Dashboard training completed (1 hour)
- [ ] Integration management training (30 minutes)
- [ ] Best practices training (30 minutes)
- [ ] Advanced features training (1 hour, Day 3)
- [ ] Q&A session completed
- [ ] Training materials sent (PDF guide, video links)

### Phone Porting (Day 3)

- [ ] Phone number ported to OTTO/M-OTTO
- [ ] Call routing configured (OTTO answers first)
- [ ] Fallback configured (transfer to staff)
- [ ] Validation call completed (OTTO answers correctly)
- [ ] Conversation flow tested (schedule appointment, quote, etc.)
- [ ] Dashboard data verified (call appears, data accurate)

### Go-Live (Day 4+)

- [ ] Production mode activated
- [ ] Location notified ("You're live!")
- [ ] Monitoring enabled (GUARDIAN/M-GUARDIAN)
- [ ] First call monitored (watch live)
- [ ] Support channels confirmed (email, phone, dashboard)
- [ ] Success metrics tracking started

### Post-Go-Live (Day 4-7)

- [ ] First call review (listen to recording, verify quality)
- [ ] First appointment booked (verify in dashboard)
- [ ] After-hours call captured (verify value)
- [ ] Customer satisfaction check (if applicable)
- [ ] Issue resolution (if any issues, resolve quickly)
- [ ] Success celebration (acknowledge win!)

---

## Resource Requirements

### Team

**Week 1 Team (4 people):**
- **Deployment Engineer (1):** Integration setup, technical troubleshooting
- **Customer Success Manager (2):** Onboarding, training, go-live support
- **Support Engineer (1):** Integration troubleshooting, technical support

**Time Commitment:**
- Deployment Engineer: 60 hours/week (full-time + overtime)
- Customer Success: 40 hours/week each (full-time)
- Support Engineer: 40 hours/week (full-time)

### Tools & Infrastructure

**Required Tools:**
- DocuSign (legal agreements)
- Secure credential collection (form or tool)
- Deployment dashboard (track progress)
- Integration testing suite (automated)
- Phone porting system (Twilio API)
- Monitoring system (GUARDIAN/M-GUARDIAN)

**Infrastructure:**
- Platform APIs (handle 150 concurrent deployments)
- Database capacity (150 locations × data requirements)
- Knowledge Graph instances (150 Neo4j databases or shared clusters)
- Phone system (Twilio capacity for 150 numbers)

### Budget

**Week 1 Deployment Costs:**
- Team: $10K (4 people × 1 week)
- Infrastructure: $5K (provisioning, setup)
- Tools: $2K (DocuSign, testing, monitoring)
- Contingency: $3K (unexpected issues)
- **Total: $20K** (2.7% of $750K seed round)

---

## Risk Mitigation

### Risk 1: Integration Failures

**Risk:** Some locations have incompatible systems or API issues

**Mitigation:**
- Pre-qualify locations (verify systems during sales)
- Test integrations before go-live (Day 2 validation)
- Fallback plan: Manual integration or custom work
- Support team ready (resolve issues same-day)

**Response Plan:**
1. Identify integration failure immediately
2. Troubleshoot (API credentials, permissions, system compatibility)
3. If unresolved in 4 hours, escalate to support engineer
4. If still unresolved, offer manual workaround or defer to Week 2

### Risk 2: Training No-Shows

**Risk:** Staff don't attend training sessions

**Mitigation:**
- Multiple training time slots (accommodate schedules)
- Record training sessions (send recording if missed)
- Required training (must complete before go-live)
- Follow-up training (offer additional sessions)

**Response Plan:**
1. Send reminder 24 hours before training
2. If no-show, send recording and schedule make-up session
3. Require completion before go-live authorization
4. Offer one-on-one training if needed

### Risk 3: Phone Porting Delays

**Risk:** Phone number porting takes longer than expected (typically 24-48 hours)

**Mitigation:**
- Start porting early (Day 2, not Day 3)
- Use temporary numbers (if porting delayed, use temp number until ported)
- Parallel processing (port multiple numbers simultaneously)
- Monitor porting status (track each port)

**Response Plan:**
1. Start porting Day 2 (extra buffer time)
2. Monitor porting status hourly
3. If delayed, use temporary number for go-live
4. Complete porting when available (seamless transition)

### Risk 4: System Performance Issues

**Risk:** Platform can't handle 150 concurrent deployments or operations

**Mitigation:**
- Load testing before Week 1 (test with 200 locations)
- Scalable infrastructure (auto-scaling APIs, databases)
- Gradual rollout (50 locations Day 4, 50 Day 6, 50 Week 2)
- Monitoring and alerting (detect issues immediately)

**Response Plan:**
1. Monitor system metrics (API latency, database performance)
2. If performance degrades, throttle new deployments
3. Scale infrastructure (add capacity)
4. Optimize queries (if database bottleneck)

### Risk 5: Staff Resistance

**Risk:** Staff don't want to use AI system (fear of replacement)

**Mitigation:**
- Clear communication (AI handles routine, staff handles complex)
- Training emphasizes collaboration (OTTO + staff = better service)
- Show benefits (less time on phone, focus on customers in shop)
- Customer success support (help with adoption)

**Response Plan:**
1. Address concerns during training
2. Show success stories (Lake Street staff happier)
3. Provide ongoing support (check in regularly)
4. Adjust if needed (customize workflows)

---

## Success Metrics

### Week 1 Success Criteria

**Deployment Metrics:**
- ✅ 150 locations deployed (100% target)
- ✅ 100% integration success rate
- ✅ 100% training completion rate
- ✅ 100% go-live success rate
- ✅ <5% issue rate (issues per location)

**Operational Metrics (End of Week 1):**
- ✅ 500+ calls answered across all locations
- ✅ 80%+ average conversion rate
- ✅ 100+ after-hours calls captured
- ✅ $50K+ after-hours revenue captured (Week 1 alone)
- ✅ 99.9% system uptime

**Customer Satisfaction:**
- ✅ 4.5+ / 5.0 average satisfaction score
- ✅ <5 support tickets per location
- ✅ 90%+ locations "very satisfied" with deployment

### Daily Success Metrics

**Day 1:**
- 20 locations onboarded
- 100% legal agreements signed
- 100% training completed

**Day 2:**
- 20 locations integrated
- 100% integration tests passing
- 0 critical issues

**Day 3:**
- 20 locations phone ported
- 100% validation calls passed
- 100% ready for go-live

**Day 4:**
- 20 locations go-live
- 50+ calls answered
- 80%+ conversion rate
- Locations 21-50 onboarded

**Day 5:**
- Locations 21-50 integrated
- Locations 21-50 validated
- Locations 51-150 onboarding started

**Weekend (Day 6-7):**
- Locations 21-50 go-live
- 100+ Weekend calls answered
- Locations 51-150 integrated

### Week 2 Preview

**Locations 51-150:**
- Day 8-9: Training and validation
- Day 10: Go-live (completing 150 total)

**Locations 1-50 (Ongoing):**
- Monitor performance
- Address issues
- Collect feedback
- Optimize configurations

---

**Week 1 Deployment Playbook Complete**  
**Status: Production-Ready - Ready for Week 1 Execution**  
**Capacity: 150 locations, 2 verticals, 7 days**



