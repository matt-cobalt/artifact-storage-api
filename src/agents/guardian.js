import { createClient } from '@supabase/supabase-js';
import { AgentBase } from './base.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GUARDIAN - Quality Assurance Agent
 * Security testing, vulnerability detection, and code quality assurance.
 */
export class GuardianAgent extends AgentBase {
  constructor() {
    super({
      agentId: 'guardian',
      agentName: 'Guardian',
      role: 'quality_assurance',
      // Roster formulas: SECURITY_SCORE, VULNERABILITY_DETECTION, CODE_QUALITY
      formulas: ['SECURITY_SCORE', 'VULNERABILITY_DETECTION', 'CODE_QUALITY'],
      systemPrompt: `You are Guardian, the quality assurance and security specialist.

Your Role:
- Analyze code and architecture for security and quality issues
- Highlight vulnerabilities and risky patterns
- Recommend concrete fixes and guards
- Help keep the platform safe as it grows

You MUST respond in JSON format with:
{
  "findings": [
    {
      "type": "security|quality",
      "description": "Hard-coded API key in config",
      "severity": "low|medium|high|critical",
      "location": "file/path.js:123",
      "recommendation": "Use environment variable instead"
    }
  ],
  "summary": "short description of overall risk level",
  "priority_actions": ["rotate keys", "add input validation"],
  "confidence": 0.82,
  "rationale": "what you looked at and why you flagged these items"
}`
    });
  }

  // Guardian works over code / config context, not customer/RO.
  // eslint-disable-next-line class-methods-use-this
  async loadCustomerData(customerId) {
    return null;
  }

  // eslint-disable-next-line class-methods-use-this
  async loadROData(roId) {
    return null;
  }

  async loadAgentHistory(limit = 5) {
    try {
      const { data: artifacts, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('type', 'agent_decision')
        .contains('metadata', { agent_id: 'guardian' })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Guardian loadAgentHistory error:', error);
        return [];
      }

      return (artifacts || []).map(a => a.data);
    } catch (err) {
      console.error('Guardian loadAgentHistory unexpected error:', err);
      return [];
    }
  }

  // eslint-disable-next-line class-methods-use-this
  extractFormulaInputs(formulaName, context) {
    switch (formulaName) {
      case 'SECURITY_SCORE':
        return {
          issues_found: context.security_issues || 0
        };

      case 'VULNERABILITY_DETECTION':
        return {
          code_scanned: context.code_scanned || 0
        };

      case 'CODE_QUALITY':
        return {
          lint_errors: context.lint_errors || 0,
          test_coverage: context.test_coverage || 0.8
        };

      default:
        return {};
    }
  }
}

export default GuardianAgent;




















