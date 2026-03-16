# OTTO Edge AI Orchestration System

**Status:** ✅ Production Ready  
**Version:** 1.0  
**Date:** December 17, 2024

---

## What is OTTO?

OTTO (Orchestrator) is the intelligent routing and coordination layer that powers **"The Edge AI"** - a unified AI assistant interface. Behind the scenes, OTTO coordinates 13 specialized Squad agents to provide comprehensive, intelligent responses.

**User Experience:** Simple, unified "Edge AI" chat interface  
**Reality:** 13 specialized agents working together seamlessly

---

## Quick Links

- 🚀 **[Quick Start Guide](docs/OTTO_QUICK_START_GUIDE.md)** - Get started in 15 minutes
- 📚 **[Full Documentation](docs/OTTO_EDGE_AI_TECHNICAL_DOCUMENTATION.md)** - Complete technical reference
- 🧪 **[Test Suite](docs/OTTO_Test_Suite.md)** - 20+ test cases
- 📊 **[Monitoring Queries](docs/OTTO_Monitoring_SQL_Queries.md)** - SQL for dashboards
- 🔧 **[Troubleshooting](docs/OTTO_Troubleshooting_Guide.md)** - Common issues and fixes

---

## Quick Start

### 1. Start the API Server

```bash
cd artifact-storage-api
node src/artifact-storage/server.js
```

### 2. Send Your First Query

```bash
curl -X POST http://localhost:3000/api/edge-ai/query \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What should I recommend for a customer getting an oil change?",
    "context": {"customer_id": "test_001"}
  }'
```

### 3. Check System Health

```bash
node src/scripts/otto-system-health-check.js
```

**That's it!** You're using The Edge AI orchestration system.

---

## Architecture

```
User Message
    ↓
OTTO Intent Classifier (detects intent)
    ↓
OTTO Agent Router (selects 1-5 agents)
    ↓
Parallel Agent Execution (all agents run simultaneously)
    ↓
OTTO Response Synthesizer (combines insights)
    ↓
Unified "Edge AI" Response
```

---

## The 13 Squad Agents

| Agent | Role | Handles |
|-------|------|---------|
| **OTTO** | Gateway & Intake | General service recommendations |
| **DEX** | Diagnostics Triage | Diagnostic procedures, trouble codes |
| **CAL** | Pricing & Estimates | Quotes, approval probability |
| **FLO** | Operations Orchestration | Scheduling, appointments |
| **MAC** | Production Manager | Shop floor, tech assignments |
| **KIT** | Parts & Inventory | Parts availability, ordering |
| **VIN** | Vehicle Intelligence | Vehicle history, recalls |
| **MILES** | Customer Retention | Win-back, loyalty, churn |
| **ROY** | Business Intelligence | KPIs, performance metrics |
| **PENNYP** | Financial Operations | Invoicing, payments |
| **BLAZE** | Marketing Intelligence | Campaigns, leads |
| **LANCE** | Compliance & Fraud | Fraud detection, compliance |
| **ORACLE** | Operational Analytics | Patterns, trends, forecasting |

---

## API Endpoint

### POST /api/edge-ai/query

**Request:**
```json
{
  "message": "Your question here",
  "context": {
    "customer_id": "optional",
    "ro_number": "optional",
    "shop_id": "optional"
  }
}
```

**Response:**
```json
{
  "success": true,
  "response": "The unified Edge AI response",
  "confidence": 0.85,
  "execution_time_ms": 1247,
  "_metadata": {
    "agents_consulted": ["cal", "miles"],
    "quality_score": 0.89
  }
}
```

---

## Key Features

- ✅ **Parallel Execution** - All agents run simultaneously for speed
- ✅ **Graceful Degradation** - System continues even if some agents fail
- ✅ **Intent Classification** - Automatically routes to correct agents
- ✅ **Response Synthesis** - Combines multiple agent insights coherently
- ✅ **Comprehensive Logging** - All orchestrations logged to Supabase
- ✅ **Performance Monitoring** - Built-in metrics and health checks

---

## Performance Targets

- **Response Time:** < 3 seconds (95th percentile)
- **Success Rate:** > 95%
- **Quality Score:** > 0.85
- **Agent Timeout:** 3 seconds per agent

---

## System Status

✅ **Operational** - Core system working correctly  
✅ **Documentation** - Complete reference materials available  
✅ **Testing** - Test suite and health checks in place  
✅ **Monitoring** - SQL queries and dashboards ready  

---

## Scripts

### Health Check
```bash
node src/scripts/otto-system-health-check.js
```

### Test Orchestration
```bash
node src/scripts/test-otto-orchestration.js
```

### Save System Artifacts
```bash
node src/scripts/save-otto-system-artifacts.js
```

### Verify Artifacts
```bash
node src/scripts/verify-otto-artifacts.js
```

---

## Database Tables

- `artifacts` - All system artifacts
- `otto_orchestrations` - Orchestration event logs
- `agent_performance_metrics` - Agent performance tracking
- `otto_errors` - Error logging and tracking

---

## Environment Variables

Required in `.env`:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
ANTHROPIC_API_KEY=your-anthropic-key
PORT=3000
```

---

## Support

- **Documentation:** See `docs/` directory
- **Troubleshooting:** See `docs/OTTO_Troubleshooting_Guide.md`
- **Health Check:** Run `node src/scripts/otto-system-health-check.js`

---

## License & Status

**Status:** Production Ready  
**Version:** 1.0  
**Last Updated:** December 17, 2024

---

**Built by:** Cursor Console #2  
**For:** The Edge AI Platform









