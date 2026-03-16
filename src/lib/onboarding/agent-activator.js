/**
 * Agent Activation System
 * Activates and tests Squad agents for new shops
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { AgentRegistry } from '../../agents/registry.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Default agent configuration
 */
const DEFAULT_AGENT_CONFIG = {
  'otto': { enabled: true, priority: 'high' },
  'sv01-revenue': { enabled: true, priority: 'high' },
  'sv02-retention': { enabled: true, priority: 'high' },
  'sv04-comms': { enabled: false, priority: 'medium', requires: 'ringcentral' },
  'sv07-marketing': { enabled: false, priority: 'medium', requires: 'ringcentral' }
};

/**
 * Activate agents for shop
 * @param {string} shopId - Shop ID
 * @param {Object} options - Activation options
 * @returns {Promise<Object>} Activation result
 */
export async function activateAgents(shopId, options = {}) {
  try {
    const { enableAll = false, skipTests = false } = options;
    
    const agents = Object.keys(AgentRegistry);
    const squadAgents = agents.filter(a => !['forge', 'atlas', 'scout', 'sage', 'guardian', 'phoenix', 'spec', 'apex', 'nexus', 'lens', 'conductor', 'mentor'].includes(a));
    
    const activationResults = [];
    let activatedCount = 0;
    let testedCount = 0;
    let passedCount = 0;

    for (const agentId of squadAgents) {
      const config = DEFAULT_AGENT_CONFIG[agentId] || { enabled: enableAll, priority: 'medium' };
      
      // Check if agent requires integration
      if (config.requires) {
        // Would check if integration is connected
        // For now, skip if requires integration and not enabled
        if (!enableAll) {
          continue;
        }
      }

      // Create agent config
      const { data: agentConfig, error: configError } = await supabase
        .from('shop_agent_configs')
        .upsert({
          shop_id: shopId,
          agent_id: agentId,
          enabled: config.enabled || enableAll,
          temperature: 0.7,
          custom_system_prompt: null
        }, {
          onConflict: 'shop_id,agent_id'
        })
        .select()
        .single();

      if (configError) {
        console.error(`Failed to create config for ${agentId}:`, configError);
        activationResults.push({
          agent_id: agentId,
          status: 'failed',
          error: configError.message
        });
        continue;
      }

      if (agentConfig.enabled) {
        activatedCount++;
      }

      // Test agent if enabled and not skipped
      if (agentConfig.enabled && !skipTests) {
        try {
          const testResult = await testAgent(agentId, shopId);
          testedCount++;
          
          if (testResult.success) {
            passedCount++;
            activationResults.push({
              agent_id: agentId,
              status: 'activated',
              tested: true,
              test_passed: true
            });
          } else {
            activationResults.push({
              agent_id: agentId,
              status: 'activated',
              tested: true,
              test_passed: false,
              test_error: testResult.error
            });
          }
        } catch (testError) {
          testedCount++;
          activationResults.push({
            agent_id: agentId,
            status: 'activated',
            tested: true,
            test_passed: false,
            test_error: testError.message
          });
        }
      } else {
        activationResults.push({
          agent_id: agentId,
          status: agentConfig.enabled ? 'activated' : 'configured',
          tested: false
        });
      }
    }

    return {
      success: true,
      agents_activated: activatedCount,
      agents_tested: testedCount,
      agents_passed: passedCount,
      all_passed: passedCount === testedCount,
      results: activationResults
    };
  } catch (error) {
    console.error('Agent activation error:', error);
    throw error;
  }
}

/**
 * Test agent execution
 * @param {string} agentId - Agent ID
 * @param {string} shopId - Shop ID
 * @returns {Promise<Object>} Test result
 */
async function testAgent(agentId, shopId) {
  try {
    const AgentClass = AgentRegistry[agentId];
    if (!AgentClass) {
      return {
        success: false,
        error: `Agent not found: ${agentId}`
      };
    }

    // Create agent instance
    const agent = new AgentClass();
    
    // Execute with test input
    const testInput = {
      test: true,
      shop_id: shopId
    };

    const result = await agent.execute(testInput, {
      shop_id: shopId,
      test_mode: true
    });

    return {
      success: true,
      result: result.decision
    };
  } catch (error) {
    console.error(`Agent test failed for ${agentId}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get agent activation status for shop
 * @param {string} shopId - Shop ID
 * @returns {Promise<Object>} Activation status
 */
export async function getAgentActivationStatus(shopId) {
  try {
    const { data: configs, error } = await supabase
      .from('shop_agent_configs')
      .select('agent_id, enabled, temperature')
      .eq('shop_id', shopId);

    if (error) {
      throw new Error(`Failed to get agent configs: ${error.message}`);
    }

    const enabledAgents = configs.filter(c => c.enabled);
    const disabledAgents = configs.filter(c => !c.enabled);

    return {
      total_agents: configs.length,
      enabled_agents: enabledAgents.length,
      disabled_agents: disabledAgents.length,
      agents: configs.map(c => ({
        agent_id: c.agent_id,
        enabled: c.enabled,
        temperature: c.temperature
      }))
    };
  } catch (error) {
    console.error('Get agent activation status error:', error);
    throw error;
  }
}

export default {
  activateAgents,
  getAgentActivationStatus
};



















