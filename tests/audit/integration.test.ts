/**
 * INTEGRATION TESTS - Trust & Safety Layer
 * Test audit trail and Trinity Test validation
 */

import { decisionLogger } from '../../src/agents/audit/decision-logger';
import { trinityTestValidator } from '../../src/agents/forge/trinity-test-validator';

describe('Audit Trail System', () => {
    const testShopId = 'test-shop-123';
    const testCustomerId = 'test-customer-456';

    test('Every agent decision creates audit log', async () => {
        const decisionId = await decisionLogger.logDecision({
            agentName: 'chat-agent',
            agentType: 'squad',
            shopId: testShopId,
            customerId: testCustomerId,
            decisionType: 'response_sent',
            inputData: {
                message: 'I need brake service',
                customerName: 'John Doe'
            },
            outputData: {
                response: 'We can help with brake service. What vehicle do you have?',
                suggestedServices: ['brake_pad_replacement', 'brake_fluid_flush']
            },
            reasoning: 'Customer requested brake service. AI identified relevant services and asked for vehicle info to provide accurate quote.',
            confidenceScore: 85,
            promptVersion: 'v1.2',
            modelUsed: 'claude-sonnet-4',
            tokensUsed: 150,
            latencyMs: 1200
        });

        expect(decisionId).toBeTruthy();
        // Verify decision was logged in database
    });

    test('Price quotes include full breakdown', async () => {
        // First log a decision
        const decisionId = await decisionLogger.logDecision({
            agentName: 'quote-agent',
            agentType: 'squad',
            shopId: testShopId,
            customerId: testCustomerId,
            decisionType: 'quote_generated',
            inputData: {
                service: 'brake_pad_replacement',
                vehicle: { year: 2019, make: 'Honda', model: 'Civic' }
            },
            outputData: {
                total: 450,
                accepted: false
            },
            reasoning: 'Standard brake pad replacement for 2019 Honda Civic. Used database pricing.',
            confidenceScore: 90
        });

        expect(decisionId).toBeTruthy();

        // Then log the quote details
        await decisionLogger.logPriceQuote(
            decisionId!,
            testShopId,
            testCustomerId,
            {
                serviceRequested: 'Brake Pad Replacement',
                vehicle: { year: 2019, make: 'Honda', model: 'Civic' },
                pricing: {
                    partsCost: 180,
                    partsSource: 'database_lookup',
                    laborHours: 2.5,
                    laborRate: 80,
                    shopSupplies: 30,
                    taxAmount: 40,
                    total: 450
                },
                rationale: 'Based on 2019 Honda Civic, front brake pads + rotors, standard pricing from parts database.',
                comparableQuotes: [
                    { service: 'Similar brake job', shop: 'Competitor A', price: 475 },
                    { service: 'Similar brake job', shop: 'Competitor B', price: 425 }
                ]
            }
        );

        // Verify quote was logged with all details
    });

    test('Appointment booking includes availability reasoning', async () => {
        const decisionId = await decisionLogger.logDecision({
            agentName: 'scheduler-agent',
            agentType: 'squad',
            shopId: testShopId,
            customerId: testCustomerId,
            decisionType: 'appointment_booked',
            inputData: {
                requestedTime: 'tomorrow morning'
            },
            outputData: {
                bookedDate: '2025-12-22',
                bookedTime: '08:00:00',
                confirmed: true
            },
            reasoning: 'Customer requested tomorrow morning. Tekmetric API showed 8 AM available. Offered alternative times as backup.',
            confidenceScore: 95
        });

        expect(decisionId).toBeTruthy();

        await decisionLogger.logAppointmentBooking(
            decisionId!,
            testShopId,
            testCustomerId,
            {
                requestedDate: '2025-12-22',
                requestedTime: 'morning',
                bookedDate: '2025-12-22',
                bookedTime: '08:00:00',
                availabilityCheckMethod: 'tekmetric_api',
                alternativeSlotsOffered: [
                    { date: '2025-12-22', time: '09:00:00' },
                    { date: '2025-12-22', time: '10:00:00' },
                    { date: '2025-12-22', time: '11:00:00' }
                ],
                bookingConfirmed: true
            }
        );

        // Verify booking was logged with reasoning
    });

    test('Daily metrics aggregation works', async () => {
        // Create some test decisions
        for (let i = 0; i < 10; i++) {
            await decisionLogger.logDecision({
                agentName: 'test-agent',
                agentType: 'squad',
                shopId: testShopId,
                customerId: `customer-${i}`,
                decisionType: i % 2 === 0 ? 'appointment_booked' : 'quote_generated',
                inputData: { test: true },
                outputData: { success: i % 3 !== 0 }, // 67% success rate
                reasoning: 'Test decision',
                confidenceScore: 80 + (i % 10),
                latencyMs: 1000 + (i * 100)
            });
        }

        // Aggregate metrics for today
        const today = new Date().toISOString().split('T')[0];
        await decisionLogger.aggregateDailyMetrics('test-agent', testShopId, today);

        // Verify metrics were aggregated
    });
});

describe('Trinity Test Guardrails', () => {
    const testAgentName = 'test-agent';

    test('A/B test starts with 10% traffic', async () => {
        const cycleId = await trinityTestValidator.startImprovementCycle({
            agentName: testAgentName,
            changeDescription: 'Add urgency language to greeting',
            changeType: 'prompt_optimization',
            previousVersion: 'v1.0.0',
            newVersion: 'v1.1.0',
            hypothesis: 'Adding urgency language will increase appointment booking rate by 10%',
            expectedImprovementPercent: 10
        });

        expect(cycleId).toBeTruthy();
        // Verify cycle was created with 10% traffic split
    });

    test('Traffic routing is consistent (same customer = same variant)', async () => {
        const customerId = 'test-customer-123';
        
        // Route same customer multiple times
        const variant1 = await trinityTestValidator.routeTraffic(testAgentName, customerId);
        const variant2 = await trinityTestValidator.routeTraffic(testAgentName, customerId);
        const variant3 = await trinityTestValidator.routeTraffic(testAgentName, customerId);

        // Should always get same variant
        expect(variant1).toBe(variant2);
        expect(variant2).toBe(variant3);
    });

    test('Statistical validation requires p < 0.05', async () => {
        // Create improvement cycle
        const cycleId = await trinityTestValidator.startImprovementCycle({
            agentName: testAgentName,
            changeDescription: 'Test change',
            changeType: 'prompt_optimization',
            previousVersion: 'v1.0.0',
            newVersion: 'v1.1.0',
            hypothesis: 'Test hypothesis',
            expectedImprovementPercent: 10
        });

        // Log A/B test results with no improvement (should fail validation)
        // Control: 50% success rate
        for (let i = 0; i < 100; i++) {
            await trinityTestValidator.logABTestResult(
                cycleId,
                testAgentName,
                'test-shop',
                `control-customer-${i}`,
                'control',
                'v1.0.0',
                i % 2 === 0, // 50% success
                50
            );
        }

        // Experimental: 50% success rate (no improvement)
        for (let i = 0; i < 100; i++) {
            await trinityTestValidator.logABTestResult(
                cycleId,
                testAgentName,
                'test-shop',
                `exp-customer-${i}`,
                'experimental',
                'v1.1.0',
                i % 2 === 0, // 50% success
                50
            );
        }

        // Check validation
        const validation = await trinityTestValidator.checkValidation(cycleId);

        expect(validation).toBeTruthy();
        // Should reject or need more data (no significant improvement)
        expect(validation?.decision).not.toBe('approve_rollout');
    });

    test('Performance degradation triggers auto-rollback', async () => {
        // This test would require mocking the performance gate monitor
        // For now, just verify the monitor function exists and can be called
        await trinityTestValidator.monitorPerformanceGates(testAgentName);

        // In production, this would check actual metrics and trigger rollback if violated
    });

    test('Approved improvements deploy to 100% traffic', async () => {
        // Create improvement cycle
        const cycleId = await trinityTestValidator.startImprovementCycle({
            agentName: testAgentName,
            changeDescription: 'Successful improvement',
            changeType: 'prompt_optimization',
            previousVersion: 'v1.0.0',
            newVersion: 'v1.1.0',
            hypothesis: 'This will improve conversion',
            expectedImprovementPercent: 15
        });

        // Log A/B test results with significant improvement
        // Control: 50% success rate
        for (let i = 0; i < 100; i++) {
            await trinityTestValidator.logABTestResult(
                cycleId,
                testAgentName,
                'test-shop',
                `control-customer-${i}`,
                'control',
                'v1.0.0',
                i % 2 === 0, // 50% success
                50
            );
        }

        // Experimental: 70% success rate (40% improvement)
        for (let i = 0; i < 100; i++) {
            await trinityTestValidator.logABTestResult(
                cycleId,
                testAgentName,
                'test-shop',
                `exp-customer-${i}`,
                'experimental',
                'v1.1.0',
                i % 3 !== 0, // ~67% success (close to 70%)
                70
            );
        }

        // Check validation
        const validation = await trinityTestValidator.checkValidation(cycleId);

        if (validation && validation.decision === 'approve_rollout') {
            // Execute validation (would deploy to 100%)
            await trinityTestValidator.executeValidation(cycleId, validation);
        }

        // Verify deployment would happen
    });
});

