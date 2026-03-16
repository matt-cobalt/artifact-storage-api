/**
 * DECISION LOGGER - Trust & Safety Layer
 * Comprehensive logging for every agent decision with full context
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || ''
);

export interface DecisionLogInput {
    agentName: string;
    agentType: 'squad' | 'forge';
    shopId?: string;
    customerId?: string;
    interactionId?: string;
    
    decisionType: string;
    inputData: any;
    outputData: any;
    reasoning: string;
    confidenceScore: number; // 0-100
    
    promptVersion?: string;
    modelUsed?: string;
    tokensUsed?: number;
    latencyMs?: number;
}

export class DecisionLogger {
    /**
     * Log every agent decision with full context
     * 
     * Used by all Squad agents to create audit trail
     * Shop owners can see: "Why did the AI quote $450?"
     * The Forge can analyze: "Which decisions led to best outcomes?"
     */
    async logDecision(input: DecisionLogInput): Promise<string | null> {
        try {
            const { data, error } = await supabase
                .from('agent_decisions')
                .insert({
                    agent_name: input.agentName,
                    agent_type: input.agentType,
                    shop_id: input.shopId || null,
                    customer_id: input.customerId || null,
                    interaction_id: input.interactionId || null,
                    
                    decision_type: input.decisionType,
                    input_data: input.inputData,
                    output_data: input.outputData,
                    reasoning: input.reasoning,
                    confidence_score: input.confidenceScore,
                    
                    prompt_version: input.promptVersion || null,
                    model_used: input.modelUsed || null,
                    tokens_used: input.tokensUsed || null,
                    latency_ms: input.latencyMs || null,
                    
                    created_at: new Date().toISOString(),
                    created_by: 'system'
                })
                .select('id')
                .single();

            if (error) {
                console.error('Failed to log decision:', error);
                // Don't fail the agent execution just because logging failed
                // But do alert that audit trail has gaps
                await this.alertAuditFailure(input.agentName, error);
                return null;
            }

            return data?.id || null;
        } catch (error: any) {
            console.error('Exception in logDecision:', error);
            await this.alertAuditFailure(input.agentName, error);
            return null;
        }
    }

    /**
     * Log customer interaction events for timeline view
     */
    async logInteractionEvent(
        shopId: string,
        customerId: string,
        interactionType: string,
        eventSequence: number,
        eventType: string,
        eventData: any,
        agentDecisionId?: string,
        conversationContext?: any
    ): Promise<void> {
        try {
            await supabase
                .from('customer_interaction_timeline')
                .insert({
                    shop_id: shopId,
                    customer_id: customerId,
                    interaction_type: interactionType,
                    event_sequence: eventSequence,
                    event_type: eventType,
                    event_data: eventData,
                    agent_decision_id: agentDecisionId || null,
                    conversation_context: conversationContext || null,
                    created_at: new Date().toISOString()
                });
        } catch (error: any) {
            console.error('Failed to log interaction event:', error);
            // Non-critical - continue execution
        }
    }

    /**
     * Log price quote with full breakdown
     */
    async logPriceQuote(
        agentDecisionId: string,
        shopId: string,
        customerId: string,
        quoteDetails: {
            serviceRequested: string;
            vehicle: { year: number; make: string; model: string };
            pricing: {
                partsCost: number;
                partsSource: string;
                laborHours: number;
                laborRate: number;
                shopSupplies: number;
                taxAmount: number;
                total: number;
            };
            rationale: string;
            comparableQuotes?: any[];
        }
    ): Promise<void> {
        try {
            await supabase
                .from('price_quote_audit')
                .insert({
                    agent_decision_id: agentDecisionId,
                    shop_id: shopId,
                    customer_id: customerId,
                    
                    service_requested: quoteDetails.serviceRequested,
                    vehicle_year: quoteDetails.vehicle.year,
                    vehicle_make: quoteDetails.vehicle.make,
                    vehicle_model: quoteDetails.vehicle.model,
                    
                    parts_cost: quoteDetails.pricing.partsCost,
                    parts_source: quoteDetails.pricing.partsSource,
                    labor_hours: quoteDetails.pricing.laborHours,
                    labor_rate: quoteDetails.pricing.laborRate,
                    shop_supplies: quoteDetails.pricing.shopSupplies,
                    tax_amount: quoteDetails.pricing.taxAmount,
                    total_quote: quoteDetails.pricing.total,
                    
                    pricing_rationale: quoteDetails.rationale,
                    comparable_quotes: quoteDetails.comparableQuotes || null,
                    
                    created_at: new Date().toISOString()
                });
        } catch (error: any) {
            console.error('Failed to log price quote:', error);
            // Non-critical - continue execution
        }
    }

    /**
     * Log appointment booking with availability reasoning
     */
    async logAppointmentBooking(
        agentDecisionId: string,
        shopId: string,
        customerId: string,
        bookingDetails: {
            requestedDate: string;
            requestedTime: string;
            bookedDate: string;
            bookedTime: string;
            availabilityCheckMethod: string;
            alternativeSlotsOffered: any[];
            bookingConfirmed: boolean;
        }
    ): Promise<void> {
        try {
            await supabase
                .from('appointment_booking_audit')
                .insert({
                    agent_decision_id: agentDecisionId,
                    shop_id: shopId,
                    customer_id: customerId,
                    
                    requested_date: bookingDetails.requestedDate,
                    requested_time: bookingDetails.requestedTime,
                    booked_date: bookingDetails.bookedDate,
                    booked_time: bookingDetails.bookedTime,
                    
                    availability_check_method: bookingDetails.availabilityCheckMethod,
                    alternative_slots_offered: bookingDetails.alternativeSlotsOffered,
                    
                    booking_confirmed: bookingDetails.bookingConfirmed,
                    
                    created_at: new Date().toISOString()
                });
        } catch (error: any) {
            console.error('Failed to log appointment booking:', error);
            // Non-critical - continue execution
        }
    }

    /**
     * Aggregate performance metrics daily
     * 
     * Run this nightly to create performance snapshots
     * Used by The Forge for Trinity Test improvement analysis
     */
    async aggregateDailyMetrics(agentName: string, shopId: string, date: string): Promise<void> {
        try {
            // Query all decisions for this agent/shop/date
            const { data: decisions, error } = await supabase
                .from('agent_decisions')
                .select('*')
                .eq('agent_name', agentName)
                .eq('shop_id', shopId)
                .gte('created_at', `${date}T00:00:00Z`)
                .lt('created_at', `${date}T23:59:59Z`);

            if (error) {
                console.error('Failed to fetch decisions for aggregation:', error);
                return;
            }

            if (!decisions || decisions.length === 0) return;

            // Calculate metrics
            const totalInteractions = decisions.length;
            const successfulOutcomes = decisions.filter(d => 
                d.output_data?.success === true || 
                d.decision_type.includes('booked') || 
                d.decision_type.includes('accepted')
            ).length;
            const successRate = totalInteractions > 0 ? (successfulOutcomes / totalInteractions) * 100 : 0;

            const avgResponseTime = decisions.length > 0
                ? Math.round(decisions.reduce((sum: number, d: any) => sum + (d.latency_ms || 0), 0) / decisions.length)
                : 0;
            const avgConfidence = decisions.length > 0
                ? decisions.reduce((sum: number, d: any) => sum + (d.confidence_score || 0), 0) / decisions.length
                : 0;

            // Count business outcomes
            const appointmentsBooked = decisions.filter((d: any) => d.decision_type === 'appointment_booked').length;
            const quotesGenerated = decisions.filter((d: any) => d.decision_type === 'quote_generated').length;

            // Calculate revenue attributed (if quotes were accepted)
            const revenueAttributed = decisions
                .filter((d: any) => d.decision_type === 'quote_generated' && d.output_data?.accepted === true)
                .reduce((sum: number, d: any) => sum + (d.output_data?.total || 0), 0);

            // Upsert metrics
            await supabase
                .from('agent_performance_metrics')
                .upsert({
                    agent_name: agentName,
                    shop_id: shopId,
                    metric_date: date,
                    metric_hour: null, // Daily aggregation
                    
                    total_interactions: totalInteractions,
                    successful_outcomes: successfulOutcomes,
                    failed_outcomes: totalInteractions - successfulOutcomes,
                    success_rate: successRate,
                    
                    appointments_booked: appointmentsBooked,
                    quotes_generated: quotesGenerated,
                    revenue_attributed: revenueAttributed,
                    
                    avg_response_time_ms: avgResponseTime,
                    avg_confidence_score: avgConfidence,
                    
                    created_at: new Date().toISOString()
                }, {
                    onConflict: 'agent_name,shop_id,metric_date,metric_hour'
                });
        } catch (error: any) {
            console.error('Failed to aggregate daily metrics:', error);
        }
    }

    /**
     * Mark decision as human reviewed
     */
    async markHumanReview(
        decisionId: string,
        outcome: 'approved' | 'corrected' | 'rejected',
        notes: string,
        reviewedBy: string
    ): Promise<void> {
        try {
            await supabase
                .from('agent_decisions')
                .update({
                    human_reviewed: true,
                    human_review_outcome: outcome,
                    human_review_notes: notes,
                    human_reviewed_at: new Date().toISOString(),
                    human_reviewed_by: reviewedBy
                })
                .eq('id', decisionId);
        } catch (error: any) {
            console.error('Failed to mark human review:', error);
        }
    }

    private async alertAuditFailure(agentName: string, error: any): Promise<void> {
        // Critical: Audit trail has gaps
        // Send alert to engineering team
        console.error('AUDIT TRAIL FAILURE:', {
            agent: agentName,
            error: error.message,
            timestamp: new Date().toISOString()
        });
        
        // TODO: Send Slack alert to engineering team
        // For now, just log to console
    }
}

export const decisionLogger = new DecisionLogger();

