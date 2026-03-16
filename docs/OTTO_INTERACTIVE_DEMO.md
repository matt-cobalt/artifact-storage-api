# OTTO Interactive Demo

**Purpose:** Interactive command-line demonstration of the Edge AI orchestration system  
**Script:** `src/scripts/otto-interactive-demo.js`

---

## Overview

The interactive demo allows you to test the OTTO orchestration system through an easy-to-use command-line interface. See how OTTO routes queries to agents, coordinates multiple agents, and synthesizes unified responses.

---

## Usage

### Start the Demo

```bash
node src/scripts/otto-interactive-demo.js
```

### Menu Options

```
OPTIONS:
  1-5 : Run predefined demo query
  c   : Enter custom query
  a   : Show all 13 Squad agents
  h   : Show help/intent examples
  q   : Quit
```

---

## Predefined Demo Queries

### 1. Pricing Query
**Message:** "What's the approval probability on this $500 brake job?"  
**Routes To:** CAL (Pricing & Estimates)  
**Shows:** Single-agent routing and pricing analysis

### 2. Service Recommendation
**Message:** "Customer is here for an oil change. What should I recommend?"  
**Routes To:** OTTO (Gateway & Intake)  
**Shows:** Service advisor capabilities

### 3. Multi-Agent Coordination
**Message:** "Customer wants brake quote, they haven't visited in 6 months"  
**Routes To:** CAL + MILES + ROY  
**Shows:** Multi-agent parallel execution and response synthesis

### 4. Diagnostics Query
**Message:** "Check engine light is on, car runs rough"  
**Routes To:** DEX (Diagnostics Triage)  
**Shows:** Diagnostic agent capabilities

### 5. Scheduling Query
**Message:** "Schedule oil change for tomorrow at 10am"  
**Routes To:** FLO (Operations Orchestration)  
**Shows:** Scheduling and workflow coordination

---

## Custom Queries

Type `c` to enter your own query. Try different phrasings to see how intent classification works:

**Examples:**
- "What's the approval probability?" → Routes to CAL
- "Schedule appointment" → Routes to FLO
- "Customer retention strategy" → Routes to MILES
- "How much should this cost?" → Routes to CAL

---

## Output Format

For each query, the demo shows:

### The Edge AI Response
The unified response that users see (branded as "The Edge AI")

### Behind the Scenes
- **Agents Consulted:** Which agents contributed to the response
- **Confidence:** Overall confidence score
- **Quality Score:** Response quality metric
- **Execution Time:** How long the orchestration took
- **Detected Intents:** Which intents OTTO identified

### What Happened
Step-by-step explanation of the orchestration process

---

## Example Session

```
🤖 THE EDGE AI - Interactive Demo
   Powered by OTTO Orchestration System
======================================================================

OPTIONS:
  1-5 : Run predefined demo query
  c   : Enter custom query
  a   : Show all 13 Squad agents
  h   : Show help/intent examples
  q   : Quit
----------------------------------------------------------------------
Select option: 3

🎯 Running Demo: Multi-Agent Coordination

🔄 Processing...

📝 Your Query:
   "Customer wants brake quote, they haven't visited in 6 months"

======================================================================
✨ THE EDGE AI RESPONSE
======================================================================

87% approval probability. This price is competitive for your market, 
and this customer has approved 92% of similar estimates. Additionally, 
since they haven't been in for 6 months, consider a win-back follow-up 
strategy to re-engage them.

======================================================================

📊 Behind the Scenes:
   Agents Consulted: CAL, MILES, ROY
   Confidence: 87.0%
   Quality Score: 91.0%
   Execution Time: 2156ms
   Detected Intents: PRICING, RETENTION

💡 What Happened:
   1. OTTO classified your message intent
   2. Routed to 3 agent(s)
   3. Agents executed in parallel
   4. OTTO synthesized their responses
   5. You received unified "Edge AI" answer

   ✨ Multi-agent coordination: 3 agents worked together!
```

---

## Features

### Agent Information
Type `a` to see all 13 Squad agents with their roles and intent mappings

### Intent Examples
Type `h` to see examples of how different intents route to different agents

### Custom Testing
Type `c` to test your own queries and see how OTTO handles them

### Real-Time Results
See actual orchestration results with:
- Execution times
- Agent coordination
- Confidence scores
- Quality metrics

---

## Tips

1. **Try Variations:** Test the same intent with different wording to see consistency
2. **Multi-Intent Queries:** Combine multiple intents in one message (e.g., "price quote for customer who hasn't visited")
3. **Edge Cases:** Try ambiguous queries to see how OTTO handles them
4. **Compare Responses:** Run similar queries to see how responses vary

---

## Use Cases

### For Developers
- Test intent classification accuracy
- Verify agent routing
- Check response quality
- Measure execution times

### For Product Managers
- See the system in action
- Understand agent capabilities
- Review response quality
- Test user-facing experience

### For Demo/Showcase
- Interactive demonstration
- Showcase multi-agent coordination
- Display system capabilities
- Explain the "Edge AI" concept

---

## Exit

Type `q` or `quit` to exit the demo. Press `Ctrl+C` to interrupt at any time.

---

## Notes

- The demo uses test data (customer IDs, etc.)
- Some agents may timeout or fail in test scenarios (expected)
- Responses may be fallback responses if agents fail (still demonstrates error handling)
- Real production data will produce richer responses

---

**Script:** `src/scripts/otto-interactive-demo.js`  
**Dependencies:** Built-in Node.js (readline module)  
**Status:** ✅ Ready to use









