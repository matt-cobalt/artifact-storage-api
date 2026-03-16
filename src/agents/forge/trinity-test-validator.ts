/**
 * TRINITY TEST VALIDATOR - Trust & Safety Layer
 * Safe autonomous agent improvement with statistical validation
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

export interface ImprovementProposal {
    agentName: string;
    changeDescription: string;
    changeType: string;
    previousVersion: string;
    newVersion: string;
    hypothesis: string;
    expectedImprovementPercent: number;
}

export interface ValidationResult {
    decision: 'approve_rollout' | 'reject_revert' | 'needs_more_data';
    reasoning: string;
    actualImprovement: number;
    pValue: number;
    sampleSize: { control: number; experimental: number };
}

export class TrinityTestValidator {
    private readonly MIN_SAMPLE_SIZE = 100; // minimum interactions before deciding
    private readonly SIGNIFICANCE_THRESHOLD = 0.05; // p < 0.05 required
    private readonly MIN_IMPROVEMENT_THRESHOLD = 5; // must improve by at least 5%

    /**
     * Step 1: Start a new improvement cycle with A/B testing
     */
    async startImprovementCycle(proposal: ImprovementProposal): Promise<string> {
        try {
            // Get next cycle number
            const cycleNumber = await this.getNextCycleNumber(proposal.agentName);

            // Create improvement cycle record
            const { data: cycle, error } = await supabase
                .from('improvement_cycles')
                .insert({
                    agent_name: proposal.agentName,
                    cycle_number: cycleNumber,
                    
                    change_description: proposal.changeDescription,
                    change_type: proposal.changeType,
                    previous_version: proposal.previousVersion,
                    new_version: proposal.newVersion,
                    
                    hypothesis: proposal.hypothesis,
                    expected_improvement_percent: proposal.expectedImprovementPercent,
                    
                    status: 'testing',
                    started_at: new Date().toISOString()
                })
                .select('id')
                .single();

            if (error) {
                throw new Error(`Failed to start improvement cycle: ${error.message}`);
            }

            if (!cycle) {
                throw new Error('Failed to create improvement cycle');
            }

            // Deploy new version to 10% of traffic (A/B test)
            await this.deployABTest(proposal.agentName, proposal.newVersion, 0.10);

            // Create performance gate for this cycle
            await this.createPerformanceGate(proposal.agentName);

            console.log(`Trinity Test: Started improvement cycle ${cycle.id} for ${proposal.agentName}`);
            console.log(`Hypothesis: ${proposal.hypothesis}`);
            console.log(`Expected improvement: ${proposal.expectedImprovementPercent}%`);

            return cycle.id;
        } catch (error: any) {
            console.error('Error starting improvement cycle:', error);
            throw error;
        }
    }

    /**
     * Step 2: Route traffic to control vs experimental
     */
    async routeTraffic(agentName: string, customerId: string): Promise<'control' | 'experimental'> {
        try {
            // Check if there's an active A/B test for this agent
            const { data: activeCycle } = await supabase
                .from('improvement_cycles')
                .select('*')
                .eq('agent_name', agentName)
                .eq('status', 'testing')
                .order('started_at', { ascending: false })
                .limit(1)
                .single();

            if (!activeCycle) {
                // No active test, use control (current version)
                return 'control';
            }

            // Consistent hashing: same customer always gets same variant
            const hash = this.hashCustomerId(customerId);
            const threshold = activeCycle.ab_test_traffic_split || 0.10;

            return hash < threshold ? 'experimental' : 'control';
        } catch (error: any) {
            console.error('Error routing traffic:', error);
            // Default to control on error
            return 'control';
        }
    }

    /**
     * Step 3: Log A/B test result
     */
    async logABTestResult(
        improvementCycleId: string,
        agentName: string,
        shopId: string,
        customerId: string,
        variant: 'control' | 'experimental',
        agentVersion: string,
        interactionSuccessful: boolean,
        primaryMetricValue: number,
        secondaryMetrics?: any
    ): Promise<void> {
        try {
            await supabase
                .from('ab_test_results')
                .insert({
                    improvement_cycle_id: improvementCycleId,
                    agent_name: agentName,
                    shop_id: shopId || null,
                    customer_id: customerId || null,
                    variant: variant,
                    agent_version: agentVersion,
                    interaction_successful: interactionSuccessful,
                    primary_metric_value: primaryMetricValue,
                    secondary_metrics: secondaryMetrics || null,
                    created_at: new Date().toISOString()
                });
        } catch (error: any) {
            console.error('Failed to log A/B test result:', error);
            // Non-critical - continue execution
        }
    }

    /**
     * Step 4: Check if we have enough data to make a decision
     */
    async checkValidation(improvementCycleId: string): Promise<ValidationResult | null> {
        try {
            // Get all A/B test results for this cycle
            const { data: results, error } = await supabase
                .from('ab_test_results')
                .select('*')
                .eq('improvement_cycle_id', improvementCycleId);

            if (error) {
                console.error('Error fetching A/B test results:', error);
                return null;
            }

            if (!results) return null;

            const controlResults = results.filter(r => r.variant === 'control');
            const experimentalResults = results.filter(r => r.variant === 'experimental');

            // Check if we have minimum sample size
            if (controlResults.length < this.MIN_SAMPLE_SIZE || 
                experimentalResults.length < this.MIN_SAMPLE_SIZE) {
                return {
                    decision: 'needs_more_data',
                    reasoning: `Need more data: Control=${controlResults.length}, Experimental=${experimentalResults.length}. Minimum=${this.MIN_SAMPLE_SIZE}`,
                    actualImprovement: 0,
                    pValue: 1,
                    sampleSize: {
                        control: controlResults.length,
                        experimental: experimentalResults.length
                    }
                };
            }

            // Calculate success rates
            const controlSuccessRate = (controlResults.filter(r => r.interaction_successful).length / controlResults.length) * 100;
            const experimentalSuccessRate = (experimentalResults.filter(r => r.interaction_successful).length / experimentalResults.length) * 100;
            
            const actualImprovement = controlSuccessRate > 0
                ? ((experimentalSuccessRate - controlSuccessRate) / controlSuccessRate) * 100
                : 0;

            // Statistical significance test (two-proportion z-test)
            const pValue = this.calculatePValue(controlResults, experimentalResults);

            // Decision logic
            let decision: 'approve_rollout' | 'reject_revert' | 'needs_more_data';
            let reasoning: string;

            if (pValue < this.SIGNIFICANCE_THRESHOLD && actualImprovement >= this.MIN_IMPROVEMENT_THRESHOLD) {
                decision = 'approve_rollout';
                reasoning = `Statistically significant improvement: ${actualImprovement.toFixed(2)}% (p=${pValue.toFixed(4)}). Rolling out to 100% traffic.`;
            } else if (pValue < this.SIGNIFICANCE_THRESHOLD && actualImprovement < 0) {
                decision = 'reject_revert';
                reasoning = `Performance degradation detected: ${actualImprovement.toFixed(2)}% (p=${pValue.toFixed(4)}). Reverting to control.`;
            } else if (pValue >= this.SIGNIFICANCE_THRESHOLD && results.length >= this.MIN_SAMPLE_SIZE * 4) {
                decision = 'reject_revert';
                reasoning = `No significant improvement after ${results.length} samples (p=${pValue.toFixed(4)}). Reverting to control.`;
            } else {
                decision = 'needs_more_data';
                reasoning = `Insufficient evidence: improvement=${actualImprovement.toFixed(2)}%, p=${pValue.toFixed(4)}. Continuing test.`;
            }

            return {
                decision,
                reasoning,
                actualImprovement,
                pValue,
                sampleSize: {
                    control: controlResults.length,
                    experimental: experimentalResults.length
                }
            };
        } catch (error: any) {
            console.error('Error checking validation:', error);
            return null;
        }
    }

    /**
     * Step 5: Execute validation decision
     */
    async executeValidation(improvementCycleId: string, validation: ValidationResult): Promise<void> {
        try {
            // Get cycle details for deployment
            const { data: cycle } = await supabase
                .from('improvement_cycles')
                .select('*')
                .eq('id', improvementCycleId)
                .single();

            if (!cycle) {
                console.error('Improvement cycle not found:', improvementCycleId);
                return;
            }

            // Update improvement cycle with results
            await supabase
                .from('improvement_cycles')
                .update({
                    status: validation.decision === 'approve_rollout' ? 'validated' : validation.decision === 'reject_revert' ? 'rejected' : 'testing',
                    actual_improvement_percent: validation.actualImprovement,
                    p_value: validation.pValue,
                    sample_size_control: validation.sampleSize.control,
                    sample_size_experimental: validation.sampleSize.experimental,
                    validation_decision: validation.decision,
                    validation_reasoning: validation.reasoning,
                    validated_at: new Date().toISOString(),
                    completed_at: validation.decision !== 'needs_more_data' ? new Date().toISOString() : null
                })
                .eq('id', improvementCycleId);

            // Execute deployment based on decision
            if (validation.decision === 'approve_rollout') {
                // Deploy experimental version to 100% traffic
                await this.rolloutToProduction(cycle.agent_name, cycle.new_version);
                
                console.log(`✓ Trinity Test SUCCESS: ${cycle.agent_name} improved ${validation.actualImprovement.toFixed(2)}%`);
                console.log(`  Deploying ${cycle.new_version} to 100% traffic`);
                
            } else if (validation.decision === 'reject_revert') {
                // Rollback to control version
                await this.rollbackVersion(
                    improvementCycleId,
                    cycle.agent_name,
                    cycle.new_version,
                    cycle.previous_version,
                    'performance_degradation'
                );
                
                console.log(`✗ Trinity Test FAILED: ${cycle.agent_name} degraded ${Math.abs(validation.actualImprovement).toFixed(2)}%`);
                console.log(`  Reverting to ${cycle.previous_version}`);
            }

            // Send alert to development team
            await this.alertValidationResult(cycle, validation);
        } catch (error: any) {
            console.error('Error executing validation:', error);
        }
    }

    /**
     * Performance gate monitoring (runs every 5 minutes)
     */
    async monitorPerformanceGates(agentName: string): Promise<void> {
        try {
            const { data: gate } = await supabase
                .from('performance_gates')
                .select('*')
                .eq('agent_name', agentName)
                .eq('active', true)
                .single();

            if (!gate) return; // No active gate

            // Get recent performance metrics
            const recentMetrics = await this.getRecentMetrics(agentName, 15); // last 15 minutes

            // Check if any gates are violated
            const violations: string[] = [];

            if (recentMetrics.successRate < gate.min_success_rate) {
                violations.push(`Success rate ${recentMetrics.successRate}% < ${gate.min_success_rate}%`);
            }

            if (recentMetrics.avgResponseTime > gate.max_response_time_ms) {
                violations.push(`Response time ${recentMetrics.avgResponseTime}ms > ${gate.max_response_time_ms}ms`);
            }

            if (recentMetrics.errorRate > gate.max_error_rate) {
                violations.push(`Error rate ${recentMetrics.errorRate}% > ${gate.max_error_rate}%`);
            }

            if (recentMetrics.consecutiveFailures > gate.max_consecutive_failures) {
                violations.push(`Consecutive failures ${recentMetrics.consecutiveFailures} > ${gate.max_consecutive_failures}`);
            }

            // If any gates violated, trigger rollback
            if (violations.length > 0) {
                console.error(`⚠️ PERFORMANCE GATE VIOLATION: ${agentName}`);
                violations.forEach(v => console.error(`  - ${v}`));

                // Get current version and rollback to previous stable
                const currentVersion = await this.getCurrentVersion(agentName);
                const previousStableVersion = await this.getPreviousStableVersion(agentName);

                // Find active improvement cycle
                const { data: activeCycle } = await supabase
                    .from('improvement_cycles')
                    .select('id')
                    .eq('agent_name', agentName)
                    .eq('status', 'testing')
                    .order('started_at', { ascending: false })
                    .limit(1)
                    .single();

                await this.rollbackVersion(
                    activeCycle?.id || null,
                    agentName,
                    currentVersion,
                    previousStableVersion,
                    'gate_violation',
                    violations
                );
            }
        } catch (error: any) {
            console.error('Error monitoring performance gates:', error);
        }
    }

    // Helper methods
    private hashCustomerId(customerId: string): number {
        // Simple hash function for consistent A/B assignment
        let hash = 0;
        for (let i = 0; i < customerId.length; i++) {
            hash = ((hash << 5) - hash) + customerId.charCodeAt(i);
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash % 100) / 100; // Return 0.00 to 0.99
    }

    private calculatePValue(controlResults: any[], experimentalResults: any[]): number {
        // Two-proportion z-test for statistical significance
        const p1 = controlResults.filter(r => r.interaction_successful).length / controlResults.length;
        const p2 = experimentalResults.filter(r => r.interaction_successful).length / experimentalResults.length;
        
        const n1 = controlResults.length;
        const n2 = experimentalResults.length;
        
        const pPool = (p1 * n1 + p2 * n2) / (n1 + n2);
        const se = Math.sqrt(pPool * (1 - pPool) * (1/n1 + 1/n2));
        
        if (se === 0) return 1; // No variance, can't determine significance
        
        const zScore = (p2 - p1) / se;
        
        // Convert z-score to p-value (two-tailed)
        // Simplified approximation - use statistical library in production
        const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
        
        return Math.max(0, Math.min(1, pValue)); // Clamp between 0 and 1
    }

    private normalCDF(z: number): number {
        // Standard normal cumulative distribution function
        // Approximation using error function
        return 0.5 * (1 + this.erf(z / Math.sqrt(2)));
    }

    private erf(x: number): number {
        // Error function approximation
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }

    private async getNextCycleNumber(agentName: string): Promise<number> {
        const { count } = await supabase
            .from('improvement_cycles')
            .select('*', { count: 'exact', head: true })
            .eq('agent_name', agentName);
        
        return (count || 0) + 1;
    }

    private async deployABTest(agentName: string, version: string, trafficPercent: number): Promise<void> {
        // TODO: Implement actual deployment to n8n/agent infrastructure
        console.log(`Deploying ${agentName} v${version} to ${trafficPercent * 100}% traffic`);
    }

    private async createPerformanceGate(agentName: string): Promise<void> {
        // Get baseline metrics from recent performance
        const baselineMetrics = await this.getRecentMetrics(agentName, 24 * 60); // 24 hours

        await supabase
            .from('performance_gates')
            .upsert({
                agent_name: agentName,
                baseline_success_rate: baselineMetrics.successRate,
                baseline_response_time_ms: baselineMetrics.avgResponseTime,
                baseline_error_rate: baselineMetrics.errorRate,
                
                // Set gates at 5% degradation threshold
                min_success_rate: baselineMetrics.successRate * 0.95,
                max_response_time_ms: baselineMetrics.avgResponseTime * 1.05,
                max_error_rate: baselineMetrics.errorRate * 1.05,
                max_consecutive_failures: 20,
                
                active: true,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'agent_name'
            });
    }

    private async rolloutToProduction(agentName: string, version: string): Promise<void> {
        // TODO: Implement 100% rollout
        console.log(`Rolling out ${agentName} v${version} to 100% traffic`);
    }

    private async rollbackVersion(
        improvementCycleId: string | null,
        agentName: string,
        fromVersion: string,
        toVersion: string,
        reason: string,
        metrics?: any
    ): Promise<void> {
        try {
            // Log rollback event
            await supabase
                .from('rollback_events')
                .insert({
                    improvement_cycle_id: improvementCycleId,
                    agent_name: agentName,
                    trigger_reason: reason,
                    trigger_metrics: metrics || null,
                    rolled_back_from: fromVersion,
                    rolled_back_to: toVersion,
                    executed_at: new Date().toISOString()
                });

            // If this was from an improvement cycle, mark it as rolled back
            if (improvementCycleId) {
                await supabase
                    .from('improvement_cycles')
                    .update({
                        status: 'rolled_back',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', improvementCycleId);
            }

            // TODO: Implement actual rollback to n8n/agent infrastructure
            console.log(`ROLLBACK: ${agentName} from ${fromVersion} to ${toVersion} (reason: ${reason})`);
        } catch (error: any) {
            console.error('Error executing rollback:', error);
        }
    }

    private async getRecentMetrics(agentName: string, minutes: number): Promise<any> {
        // TODO: Query recent agent_performance_metrics and agent_decisions
        // For now, return defaults
        return {
            successRate: 75,
            avgResponseTime: 3000,
            errorRate: 5,
            consecutiveFailures: 3
        };
    }

    private async getCurrentVersion(agentName: string): Promise<string> {
        // TODO: Get current deployed version from agent registry
        return 'v1.2.3';
    }

    private async getPreviousStableVersion(agentName: string): Promise<string> {
        // Get last validated improvement cycle
        const { data } = await supabase
            .from('improvement_cycles')
            .select('previous_version')
            .eq('agent_name', agentName)
            .eq('status', 'validated')
            .order('completed_at', { ascending: false })
            .limit(1)
            .single();

        return data?.previous_version || 'v1.0.0';
    }

    private async alertValidationResult(cycle: any, validation: ValidationResult): Promise<void> {
        // TODO: Send Slack alert with validation results
        console.log('VALIDATION ALERT:', {
            agent: cycle.agent_name,
            decision: validation.decision,
            improvement: validation.actualImprovement,
            pValue: validation.pValue
        });
    }
}

export const trinityTestValidator = new TrinityTestValidator();

