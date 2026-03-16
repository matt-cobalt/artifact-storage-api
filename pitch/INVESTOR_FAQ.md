# Cobalt AI - Investor FAQ
**50 Common Investor Questions Answered**

**Version:** 1.0  
**Date:** 2025-12-20  
**Status:** Investor-Ready FAQ Document

---

## PRODUCT & TECHNOLOGY (10 Questions)

### 1. What is a Massive Language Model?

A "Massive Language Model" refers to our architecture that uses 25 coordinated AI agents (not just one chatbot) working together to handle complex business operations. "Massive" describes the scale and coordination of multiple specialized agents, each with domain expertise, all orchestrated by NEXUS. It's like having 25 specialized employees working in perfect coordination, not one generalist trying to do everything. The term also signals our position as category creators—we're not just another AI startup, we're building the platform layer for multi-agent AI applications.

### 2. How is this different from ChatGPT?

ChatGPT is a single conversational AI interface. Cobalt AI is a platform with 25 specialized agents (OTTO for customer service, CAL for pricing, FLO for scheduling, DEX for diagnostics, etc.) that coordinate through NEXUS, access real-time business data (Tekmetric, EHR systems), maintain temporal knowledge graphs with bi-temporal reasoning, embed 125 mathematical formulas (Control Theory, Information Theory, Markov Processes), and improve autonomously (0.5%/day accelerating). ChatGPT answers questions; Cobalt AI runs entire business operations. ChatGPT is a tool; Cobalt AI is infrastructure. The comparison is like asking how Salesforce differs from email—different category, different scale, different value.

### 3. Why 25 agents instead of 1 better agent?

Specialization beats generalization. One agent trying to handle customer service, pricing, scheduling, diagnostics, inventory, billing, analytics, and security would be a "jack of all trades, master of none." Our 25 agents each excel at their domain (OTTO is the best customer service agent, CAL is the best pricing agent, etc.) and coordinate seamlessly through NEXUS. This architecture enables 3x learning rates (tri-channel), autonomous improvement per agent, and scalability (add new agents for new capabilities without retraining everything). It's like asking why a business has a CFO, CTO, and COO instead of one CEO doing everything—specialization creates better outcomes.

### 4. What's tri-channel architecture?

Tri-channel architecture splits learning and operations across three parallel channels. Channel 1 handles customer communication (phone, SMS, web), generating interaction data. Channel 2 processes that data through platform intelligence (25 agents, pattern extraction, cross-vertical learning). Channel 3 provides product interfaces (dashboards, APIs) that query live data. These channels operate in parallel and feed into each other, creating a 3x learning rate compared to dual-channel systems (where communication and intelligence share one channel). Competitors will build 2 channels; we have 3. This creates a persistent architectural advantage.

### 5. How do dual-use bridges work?

Dual-use bridges are agents that serve two functions simultaneously, making our architecture invisible to competitors. OTTO is both the customer-facing interface (appears as a standard chatbot) AND the data nexus coordinating 11 specialized agents behind the scenes. NEXUS is both the integration specialist (handles external systems like Tekmetric, EHRs) AND the network coordinator (distributes patterns across verticals). Competitors see standard integrations and conversational AI; they don't see the sophisticated coordination layer. This invisibility creates an 18-24 month discovery gap—competitors will copy the visible parts but miss the dual-use architecture.

### 6. What's temporal knowledge graph?

A temporal knowledge graph stores facts and relationships with two time dimensions: event time (when something was true in the real world) and ingestion time (when the system learned it). This enables point-in-time queries ("Who was Sarah's mechanic in August 2024?"), historical relationship tracking, and bi-temporal reasoning. Our Neo4j implementation achieves sub-200ms query performance through hybrid retrieval (semantic + keyword + graph traversal) and optimized indexes. This creates an 18-24 month gap because competitors would need to implement bi-temporal tracking, build hybrid retrieval engines, and optimize for sub-200ms performance—all non-trivial engineering challenges.

### 7. Is this proprietary or can competitors copy?

The architecture is proprietary, though individual components (LLMs, databases) are not. Our competitive moat comes from the combination: tri-channel architecture, dual-use bridges, temporal knowledge graph, 25-agent coordination, 125 mathematical formulas (Control Theory, Information Theory, Markov Processes), cross-vertical pattern library, and 8-step deployment automation. Competitors can copy individual pieces (they'll build 25 agents, they'll use Neo4j), but replicating the entire system with mathematical foundations takes 36-48 months. By that time, we'll have 2,000+ locations, a data moat (historical data becomes valuable), and network effects (more locations = more patterns = more value). The moat is time + data + network effects + mathematical sophistication, not just code.

### 8. What LLM do you use?

Claude Sonnet 4 (Anthropic). We chose Claude over GPT-4 because of better reasoning capabilities for complex business logic, superior system prompt adherence (critical for agent coordination), and more consistent outputs (reduces errors in production). We're not locked to Claude—our architecture abstracts the LLM layer, so we can switch providers if needed. We've tested GPT-4, Gemini, and Llama 3.1 as backups. However, Claude Sonnet 4 currently provides the best performance for our use case (multi-agent coordination, complex reasoning, consistent outputs).

### 9. What happens if Anthropic raises prices?

We have multiple mitigations: (1) Token optimization (we've reduced costs 50-70% through caching, prompt engineering, formula embedding), (2) Provider abstraction (can switch to GPT-4, Gemini, or Llama if needed), (3) Formula embedding (many calculations happen outside LLM calls), (4) Vertical-specific models (smaller, cheaper models for simpler tasks). Our current cost is $67-134/month per location (down from $268 baseline). Even if Anthropic doubles prices, we'd still be at $134-268/month, which is acceptable given our $99-199/month pricing. However, we're actively working toward <$50/month AI costs through further optimization.

### 10. Can you switch LLM providers?

Yes. Our architecture abstracts the LLM layer through a provider interface. We can switch from Claude to GPT-4, Gemini, Llama, or any other provider with minimal code changes (typically 1-2 days of testing and adjustment). We've already tested GPT-4 and Gemini as backups. However, switching isn't free—each provider has different capabilities, pricing, and output quality. Claude Sonnet 4 currently provides the best performance for our use case. If Anthropic becomes unreliable or too expensive, we can switch, but we'd expect a 1-2 week transition period to retune prompts and validate performance.

---

## MARKET & COMPETITION (10 Questions)

### 11. Who are your competitors?

Traditional enterprise software (ServiceTitan for auto shops, athenahealth for medical practices) and newly funded AI agent startups. Traditional competitors have expensive infrastructure ($1.35M/year), slow deployment (12-18 months), and single-vertical focus. AI agent startups are building prototypes (not production), have single or dual-channel architectures (we have tri-channel), and focus on single verticals. We're the only platform with production validation (90 days, 87% conversion), multi-vertical deployment Week 1, and 24-30 month architectural lead. Our real competition is time—we need to establish market dominance before competitors replicate our architecture.

### 12. What if ServiceTitan builds this?

ServiceTitan would need 36-48 months to replicate our architecture (tri-channel, dual-use bridges, temporal KG, cross-vertical learning, 125 mathematical formulas including Control Theory for autonomous optimization). By that time, we'll have 2,000+ locations, a data moat, network effects, and mathematical sophistication they can't easily replicate. However, ServiceTitan's business model depends on expensive infrastructure ($1.35M/year per customer)—they can't compete at our price point ($99-199/month) without cannibalizing their own revenue. More likely, ServiceTitan becomes a customer or integration partner (we integrate with their systems). Our strategy: Partner with incumbents, don't compete head-to-head on features—compete on architecture, mathematical sophistication, speed, and cost.

### 13. What if OpenAI launches GPT for Business?

OpenAI would likely launch a generic business AI assistant (like ChatGPT for businesses), not a specialized multi-agent platform for Main Street. Even if they built 25 agents, they'd lack our domain expertise (13 years automotive, medical compliance, HVAC operations), vertical-specific formulas (39 mathematical models), and deployment automation (8-step workflow). However, if OpenAI launched a direct competitor, we'd have 18-24 months of first-mover advantage (locations, data, network effects) and could pivot to white-label platform (sell infrastructure to vertical SaaS companies). Our moat isn't just technology—it's domain expertise + execution speed.

### 14. How defensible is this?

Very defensible. Seven-layer moat: (1) 25 agents (6-12 months to replicate), (2) 125 formulas including Control Theory (12-18 months to integrate and validate), (3) Multi-vertical (12-18 months), (4) Dual-channel learning (12-18 months), (5) Dual-use bridges (18-24 months), (6) Temporal KG (18-24 months), (7) Data gravity at 2,000+ locations (unreachable). By Month 12, switch cost = $10M (customers integrated, historical data valuable, workflows embedded). By Month 24, unreachable (network effects, data moat, mathematical sophistication, category leadership). Total gap: 36-48 months minimum. Additionally, our capital-efficient model ($950/year vs $1.35M) means competitors can't compete on price without rebuilding their entire infrastructure.

### 15. Why won't incumbents add AI features?

They will, but slowly. Enterprise software companies move at enterprise pace (12-18 month release cycles, committees, approvals). They're also constrained by legacy infrastructure ($1.35M/year costs) and existing business models (can't cannibalize revenue). We move at startup pace (weeks, not months) and have no legacy constraints. Additionally, incumbents will add AI features to existing products (single vertical, single channel), not build multi-vertical platforms with tri-channel architecture. By the time incumbents catch up on AI features, we'll have 24-30 month architectural lead and market dominance.

### 16. What's your moat?

Seven-layer moat: (1) Architecture (tri-channel, dual-use bridges, temporal KG), (2) Domain expertise (13+8+5 years multi-spectral experience), (3) Execution speed (25 agents in 5 weeks, 30-60x faster), (4) Capital efficiency ($950/year vs $1.35M), (5) First-mover advantage (150 locations Week 1), (6) Data gravity (historical data becomes valuable), (7) Network effects (more locations = more patterns = more value). The moat compounds over time—every month widens the gap. By Month 12, switch cost = $10M. By Month 24, unreachable.

### 17. Why 24-30 months to replicate?

Visible layers (25 agents, 125 formulas, multi-vertical, dual-channel) take 12-18 months to replicate. Invisible layers (dual-use bridges, temporal KG with bi-temporal reasoning, Control Theory integration for autonomous optimization) take 18-24 months to discover and implement. Mathematical foundations (Control Theory, Information Theory, Markov Processes) add another 12-18 months. However, by the time competitors replicate our architecture + mathematical foundations, we'll have 2,000+ locations, years of operational data, optimized queries, network effects, and mathematical sophistication. The gap isn't just technical—it's temporal + mathematical. We started 90 days ago and have production validation + 125 formulas. Competitors start today with zero. By Month 24, we'll be unreachable. Total gap: 36-48 months minimum.

### 18. What about Y Combinator startups?

YC startups are talented and well-funded, but they're building prototypes (not production), have single-vertical focus, and lack our domain expertise. YC startups typically raise $500K-1M, build for 12-18 months, then raise Series A. We're raising $500K-750K, deploying 150 locations Week 1, and raising Series A at Month 6 with production validation. Additionally, YC startups often build for tech-forward customers (SaaS companies, developers); we build for Main Street (auto shops, medical practices). Different market, different execution speed, different defensibility.

### 19. Can this be white-labeled?

Yes, and that's part of our strategy. We're already white-labeling the platform to vertical entities (Auto Intel GTP LLC, Cobalt Medical LLC) under the Cobalt AI Platform. In the future, we could white-label to vertical SaaS companies (they integrate our agents into their products). This creates additional revenue streams (platform licensing) and expands our addressable market (we don't need to build every vertical ourselves). However, our primary strategy is direct deployment (we control the customer relationship, we capture full value, we build the brand).

### 20. What's your IP strategy?

We're filing 5 provisional patents on: (1) Tri-channel architecture for multi-agent learning, (2) Dual-use bridge agents (OTTO, NEXUS), (3) Temporal knowledge graph with bi-temporal reasoning, (4) Cross-vertical pattern extraction and distribution, (5) 8-step automated vertical deployment workflow. Additionally, we're filing 10+ trademarks (Cobalt AI, Auto Intel GTP, Massive Language Model Platform). IP provides additional defensibility, but our primary moat is execution speed + data gravity + network effects. Patents take 2-3 years to issue; by then, we'll have market dominance regardless.

---

## BUSINESS MODEL (10 Questions)

### 21. How do you make money?

Per-location subscription pricing: $49.95/month (Founding 100, locked forever), $99/month (Standard), $199/month (Premium), Custom (Enterprise). Revenue per location ranges from $599/year (Founding) to $2,388/year (Premium). At 1,000 locations with 50% Standard / 30% Premium mix, that's $1.19M ARR. Additionally, we charge for enterprise features (custom integrations, dedicated support) and future platform licensing (white-label to vertical SaaS companies). Primary revenue: Subscription fees. Secondary revenue: Enterprise features, platform licensing.

### 22. What's the pricing?

$49.95/month (Founding 100 customers, locked forever), $99/month (Standard tier, default for new customers), $199/month (Premium tier, advanced features, analytics, priority support), Custom (Enterprise, multi-location, custom integrations). Average revenue per location (ARPU) is $99/month in Year 1-2, increasing to $120-150/month in Year 3+ as Premium mix increases. Our pricing is 1/100th the cost of enterprise software ($99/month vs $50K+/year), making it accessible to Main Street while maintaining 70-85% gross margins at scale.

### 23. Why so cheap vs enterprise software?

Our capital-efficient architecture ($950/year infrastructure per vertical vs $1.35M traditional) enables low pricing while maintaining profitability. Enterprise software companies have expensive infrastructure (dedicated servers, large teams, slow development cycles). We use serverless architecture, AI agents (not manual development), and shared platform infrastructure (one platform serves all verticals). Additionally, we're optimizing for volume (1,000+ locations) not margin per customer. Enterprise software optimizes for margin per customer (fewer customers, higher prices). We're building a platform, not consulting services.

### 24. What are unit economics?

At scale (1,000+ locations): Revenue $99/month per location, AI cost $67/month (optimized), Infrastructure $0.60/month (allocated), COGS $67.60/month, Gross Margin 31.7%. With Premium tier mix (30% at $199/month), gross margin increases to 70-85%. LTV:CAC ratio is 13.9:1 at Year 2 (improving to 29.7:1 at Year 3+). CAC payback period is 12.7 months at Year 2 (improving to 9.5 months at Year 3+). These are strong unit economics that enable capital-efficient growth.

### 25. When do you become profitable?

Breakeven at Month 18 (Year 2 Q2) with 850 locations generating $85K MRR ($1.02M ARR). Positive EBITDA by Month 24 (Year 2 Q4) with 1,000 locations. EBITDA margin reaches 10% by Year 3, 30% by Year 4, and 35% by Year 5. This assumes $500K-750K seed raise, Series A at Month 6 ($3M-5M), and capital-efficient growth model. Path to profitability is faster than typical SaaS companies because of low infrastructure costs and strong unit economics.

### 26. What's LTV:CAC ratio?

LTV (Lifetime Value) = ($1,188/year ARPU × 75% gross margin) / 16% annual churn = $5,568. CAC (Customer Acquisition Cost) = $400 in Year 2. LTV:CAC ratio = 13.9:1. This improves to 29.7:1 at Year 3+ (lower churn, higher LTV). Target is 3:1 minimum (we exceed by 4-10x). Strong LTV:CAC enables capital-efficient growth—we can acquire customers profitably and reinvest revenue into growth.

### 27. What's churn rate?

3% monthly in Year 1 (early adopters, product-market fit refinement), decreasing to 2.5% in Year 1 months 7-12, 2% in Year 2 Q1-Q2, 1.5% in Year 2 Q3-Q4, and 1% in Year 3+ (mature platform). Annual churn: ~30% Year 1, ~22% Year 2, ~16% Year 2 Q4, ~11% Year 3+. Churn reduction drivers: ROI validation (15,105% proven), network effects (cross-vertical learning), data moat (historical data valuable), integration depth (Tekmetric, EHR systems). Target: <10% annual churn at scale (best-in-class SaaS).

### 28. How do you calculate ROI for customers?

Customer ROI = (Additional Revenue + Cost Savings) / Subscription Cost. Example (Lake Street Automotive): $657,720/year after-hours revenue captured, $50K/year cost savings (staff efficiency), $1,188/year subscription cost. ROI = ($657,720 + $50,000) / $1,188 = 595x (or 15,105% if calculated as percentage). We track ROI per customer through integration data (Tekmetric revenue, appointment bookings, staff time saved). Average ROI across customers: 300-600x (varies by vertical, location size, adoption rate).

### 29. What's gross margin?

Gross margin = (Revenue - COGS) / Revenue. COGS includes AI costs ($67/month optimized) and infrastructure ($0.60/month allocated). At $99/month revenue: Gross margin = ($99 - $67.60) / $99 = 31.7%. With Premium tier mix (30% at $199/month), gross margin increases to 70-85% (higher revenue, same costs). Target: 70-85% gross margin at scale (premium tier mix, optimized costs). This is strong for SaaS companies (typical range: 70-85%).

### 30. Path to $100M ARR?

Year 1: $354K ARR (355 locations), Year 2: $1.02M ARR (1,000 locations), Year 3: $3.24M ARR (3,000 locations), Year 4: $12M ARR (10,000 locations), Year 5: $30M ARR (25,000 locations). Path to $100M ARR: Year 6-7 with 75,000-100,000 locations across 8-10 verticals. This requires scaling sales (10-20 person sales team), expanding verticals (add 2-3 per year), and maintaining capital efficiency. At $100M ARR with 35% EBITDA margin, company value = $500M-1B (5-10x revenue multiple for profitable SaaS).

---

## GO-TO-MARKET (10 Questions)

### 31. How do you acquire customers?

Multi-channel approach: (1) Founder-led sales (high-touch, $500 CAC, Year 1), (2) Sales team (scaling, $400 CAC, Year 2), (3) Referrals (product-market fit, $0 CAC, Year 2+), (4) Partnerships (Tekmetric, practice management systems, $300 CAC, Year 2+), (5) Content marketing (thought leadership, category creation, $200 CAC, Year 3+). Target: Blend CAC to $300 by Year 3 (product-market fit, referrals, partnerships). Sales cycle: 2-4 weeks (quick decision, low price point, clear ROI).

### 32. What's CAC?

Customer Acquisition Cost = Total Sales & Marketing Spend / New Customers Acquired. Year 1: $500 CAC (founder-led, high-touch, 200 customers, $100K spend). Year 2: $400 CAC (sales team scaling, 750 customers, $300K spend). Year 3+: $300 CAC (product-market fit, referrals, partnerships, 2,000+ customers, $600K+ spend). Target: <$400 CAC (enables 3:1+ LTV:CAC ratio with $1,485 LTV). We're optimizing for volume, not margin per customer.

### 33. Sales cycle length?

2-4 weeks average. Fast sales cycle because: (1) Low price point ($99/month, no long approval process), (2) Clear ROI (15,105% proven, easy to understand), (3) Quick deployment (Week 1, no long implementation), (4) Low risk (month-to-month, can cancel anytime). Compare to enterprise software: 6-12 month sales cycles, $50K+ price points, 12-18 month implementations. Our speed is a competitive advantage—customers can try us quickly, see results immediately, and scale rapidly.

### 34. Who's the buyer (owner, ops manager)?

Primary buyer: Business owner (auto shop owner, practice administrator, HVAC company owner). Decision criteria: ROI (15,105% proven), ease of use (no training required), deployment speed (Week 1), price ($99/month accessible). Secondary influencer: Operations manager (uses the system daily, provides feedback). However, owner makes final decision (controls budget, sees ROI impact). Our messaging targets owners (ROI, revenue impact, competitive advantage) but we demo to operations managers (they see the value in daily use).

### 35. How do you deploy so fast?

8-step automated deployment workflow: (1) Database schema (30 min), (2) Knowledge graph (45 min), (3) Agents (2 hours), (4) Formulas (1 hour), (5) Workflows (1 hour), (6) Integrations (1 hour), (7) Validation tests (1 hour), (8) Go-live (30 min). Total: 7 hours sequential, 3 hours parallel. Most time is automated (Infrastructure-as-Code, automated testing, validation scripts). Human time: 2-4 hours (configuration, credential setup, go-live authorization). Compare to enterprise software: 12-18 months manual implementation. Our speed is a competitive advantage.

### 36. What's implementation time?

Week 1 for new vertical (automotive, medical, HVAC). Day 1-2: Database and knowledge graph setup, agent deployment. Day 3-4: Formula configuration, workflow setup, integration connections. Day 5-7: Validation tests, staff training (2 hours remote), go-live. Total human time: 4-6 hours per location (mostly configuration, credential setup). Automated time: 3-7 hours (Infrastructure-as-Code, testing, validation). Compare to enterprise software: 3-6 months per location. Our speed enables rapid scaling (10-20 locations per week per vertical).

### 37. Integration requirements?

Automotive: Tekmetric (shop management system), Twilio (SMS/voice), Stripe (payments). Medical: Practice management system (athenahealth, AdvancedMD, Kareo), insurance clearinghouse (Change Healthcare, Availity), Twilio (SMS/voice), Stripe (payments). HVAC: Field service management system, Twilio (SMS/voice), Stripe (payments). Integration setup: 1-2 hours (API credentials, test connection, data sync validation). Most integrations use standard APIs (REST, webhooks). We handle integration complexity—customers just provide credentials, we handle the rest.

### 38. Training required?

2 hours remote training per location (optional but recommended). Training covers: (1) Dashboard navigation (30 min), (2) Agent capabilities (30 min), (3) Integration management (30 min), (4) Best practices (30 min). However, system is designed for zero training—agents handle customer interactions automatically, dashboard is intuitive, integrations work automatically. Training is for optimization (how to get maximum value), not basic usage. Compare to enterprise software: 20-40 hours training per location. Our zero-training design is a competitive advantage.

### 39. Support model?

Multi-tier support: (1) In-app chat (S-SUPPORT agent, 24/7, handles 80% of questions), (2) Email support (response within 4 hours, handles 15% of questions), (3) Phone support (critical issues only, handles 5% of questions). Support is included in Standard tier, priority support in Premium tier. We're building toward 95% automated support (S-SUPPORT agent handles most questions) with human escalation for complex issues. Target: <1% of customers need human support (system designed for self-service).

### 40. Reference customers?

Lake Street Automotive (automotive, 90 days production, 87% conversion, 15,105% ROI, $657K/year revenue impact). 50 medical clinics (committed, LOI signed, deploying Week 1 post-funding). 100 automotive shops (pipeline, ready to deploy Week 1 post-funding). We're building reference customer base rapidly—by Month 6, we'll have 500+ locations as references. Reference customers provide: Case studies, testimonials, referrals, social proof. We're actively collecting case studies and testimonials for sales and marketing.

---

## TEAM & FUNDING (10 Questions)

### 41. Why is Matt the right founder?

Unique multi-spectral background: 13 years automotive industry (domain expertise), 8 years Bering Sea commercial fishing (extreme decision-making under pressure), 5 years Los Alamos National Laboratory (safety-critical operations, zero-error tolerance). This combination created the pattern recognition that designed the tri-channel architecture, dual-use bridges, and temporal knowledge graph. Additionally, technical velocity: Built 25 operational agents in 5 weeks (30-60x faster than traditional), Trinity Test completed 23 days ahead of schedule. Competitors can hire engineers; they can't replicate 13+8+5 years of domain synthesis. Mission-driven: Preserving Main Street, not just building a business.

### 42. What's the team plan?

Year 1 (4 people): Founder (Matt), Forge Lead/CTO, Squad AI Lead, Backend Engineer. Year 2 (10 people): Add Frontend Engineer, DevOps Engineer, Sales Lead, Customer Success, Marketing Lead, 2x Backend Engineers. Year 3 (20 people): Add 10 more across engineering, sales, customer success. Target: Lean team (20 people at $3M ARR, 40 people at $12M ARR, 60 people at $30M ARR). We're optimizing for capital efficiency—small team, high leverage (AI agents do the work, team orchestrates). Compare to traditional SaaS: 50-100 people at $3M ARR, 200-300 people at $12M ARR.

### 43. Key hires in next 6 months?

Priority 1: Forge Lead/CTO (platform architecture, deployment automation, team building). Priority 2: Squad AI Lead (agent development, coordination, optimization). Priority 3: Backend Engineer (API development, database optimization, integrations). Priority 4 (optional): Frontend Engineer (dashboard improvements, customer portal). We're hiring for technical depth and execution speed—people who can build fast, ship fast, iterate fast. Target: Hire 3-4 people in first 3 months post-funding, scale to 10 people by Month 12.

### 44. How much are you raising?

$500K-750K seed round. Use of funds: Team (40%, $300K), Deployment (20%, $150K), Sales & Marketing (13%, $100K), Legal & IP (7%, $50K), Runway (20%, $100-150K). Timeline: Fund Week 1, deploy 150 locations Week 1, Series A at Month 6 ($3M-5M at $40M-60M post). We're raising enough to prove multi-vertical platform (150 locations, 2 verticals operational) and position for Series A, not enough to scale to profitability (that's Series A's job). Target: 12-month runway to Series A.

### 45. What's the valuation?

Pre-money valuation: $5M-8M (depending on round size and investor terms). Post-money: $5.5M-8.75M. This values the company at 15-25x current ARR ($354K projected Year 1) or 7-10x Year 2 ARR ($1.02M), which is reasonable for seed-stage SaaS with strong traction (87% conversion, 15,105% ROI, production validation). However, we're flexible on valuation—more important is finding the right investors (domain expertise, network, strategic value). We're considering SAFE (simpler, faster) or priced round (clearer terms).

### 46. Use of funds breakdown?

Team (40%, $300K): Forge Lead/CTO ($140K salary + equity), Squad AI Lead ($130K salary + equity), Backend Engineer ($120K salary + equity). Deployment (20%, $150K): Medical 50 clinics Week 1 ($75K), Automotive 100→150 optimization ($50K), HIPAA audit ($15K), Platform scaling ($10K). Sales & Marketing (13%, $100K): Customer acquisition ($60K), Content marketing ($20K), PR/analyst relations ($20K). Legal & IP (7%, $50K): Patents ($25K), Trademarks ($10K), BAAs ($10K), Corporate ($5K). Runway (20%, $100-150K): 12-month buffer, Series A prep.

### 47. Runway from this round?

12 months to Series A (Month 6 target, Month 12 latest). Monthly burn: ~$75K average Year 1 (team $55K, S&M $8K, G&A $8K, AI $20-30K, Infrastructure $1K). With $500K seed: 6.7 months runway (requires Series A by Month 6). With $750K seed: 10 months runway (comfortable to Month 12). We're targeting $750K to provide buffer (unexpected costs, slower sales, delayed Series A). However, we're planning for Month 6 Series A (strong traction, multi-vertical proof, investor interest).

### 48. When do you raise Series A?

Month 6 target (Month 12 latest). Series A criteria: (1) 1,000 locations (500 minimum), (2) $100K MRR ($85K minimum), (3) Multi-vertical proof (3 verticals operational), (4) Strong unit economics (LTV:CAC 10:1+, gross margin 30%+), (5) Capital efficiency (breakeven path visible). Target raise: $3M-5M at $40M-60M post (10-15x Year 2 ARR projection). We're building toward Series A from Day 1—every milestone (locations, revenue, verticals) positions us for Series A.

### 49. Exit strategy?

Strategic acquisition (most likely): Enterprise software companies (ServiceTitan, athenahealth), AI platform companies (Anthropic, OpenAI), vertical SaaS companies (looking to add AI capabilities). Exit timeline: 5-7 years. Exit valuation: $200M-500M (6-10x Year 5 ARR of $30M, or 3-5x if acquired earlier). Alternative: IPO path (10+ years, $1B+ valuation). However, strategic acquisition is more likely (enterprise software companies need AI capabilities, we provide platform + expertise). We're building for acquisition, not IPO (faster exit, clearer path).

### 50. Can you bootstrap this?

No. Requires capital for: (1) Team (can't build 25 agents alone, need engineers), (2) Deployment (50 medical clinics Week 1 requires infrastructure, HIPAA audit), (3) Sales & marketing (can't acquire 1,000 locations without sales team), (4) Legal & IP (patents, trademarks, BAAs cost $50K+). Bootstrap path would take 5-10 years (too slow, competitors catch up). We need $500K-750K seed to prove multi-vertical platform (150 locations, 2 verticals) and raise Series A at Month 6 ($3M-5M) to scale to profitability. Capital-efficient growth model enables fast path to profitability (Month 18) with minimal capital ($5M-10M total raised).

---

**Investor FAQ Complete**  
**50 Questions Answered**  
**Status: Ready for Investor Q&A**



