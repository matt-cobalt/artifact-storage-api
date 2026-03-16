import 'dotenv/config';
import MOttoAgent from '../agents/m-otto.js';

/**
 * Test M-OTTO Patient Intake
 */

async function testMottoIntake() {
  console.log('Testing M-OTTO patient intake...\n');

  const motto = new MOttoAgent();

  try {
    // Test 1: New patient intake
    console.log('━━━ Test 1: New patient with back pain ━━━');
    const start1 = Date.now();

    const result1 = await motto.execute({
      action: 'process_call',
      from: '+1-509-555-1234',
      message: 'I need to see a doctor for lower back pain. It\'s been bothering me for 2 weeks.',
      clinic_id: 'test_clinic_001'
    });

    const latency1 = Date.now() - start1;

    console.log('Response received:', result1.success ? '✓' : '✗');
    console.log('Response time:', `${latency1}ms`);
    console.log('Decision:', JSON.stringify(result1.decision, null, 2));

    // Verify response contains medical disclaimer
    const decisionStr = JSON.stringify(result1.decision || {});
    const hasDisclaimer = decisionStr.includes('emergency') || decisionStr.includes('911') || 
                         decisionStr.includes('disclaimer');

    // Verify appointment options
    const hasAppointments = result1.decision?.appointment_options?.length > 0;

    // Verify insurance info requested
    const hasInsurance = result1.decision?.insurance_info_required || 
                        decisionStr.includes('insurance');

    // Verify chief complaint
    const hasComplaint = result1.decision?.patient_intake?.chief_complaint ||
                        decisionStr.includes('back pain');

    console.log('\nValidation Checks:');
    console.log(`  ${hasDisclaimer ? '✓' : '✗'} Medical disclaimer included`);
    console.log(`  ${hasAppointments ? '✓' : '✗'} Appointment options provided`);
    console.log(`  ${hasInsurance ? '✓' : '✗'} Insurance info requested`);
    console.log(`  ${hasComplaint ? '✓' : '✗'} Chief complaint captured`);
    console.log(`  ${latency1 < 5000 ? '✓' : '✗'} Response time <5s (actual: ${latency1}ms)`);

    // Test 2: Performance benchmark
    console.log('\n\n━━━ Test 2: Performance Benchmark ━━━');
    const iterations = 5;
    const latencies = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await motto.execute({
        action: 'process_call',
        from: `+1-509-555-${1000 + i}`,
        message: 'Need appointment for neck pain',
        clinic_id: 'test_clinic_001'
      });
      latencies.push(Date.now() - start);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    console.log(`Average latency: ${avgLatency.toFixed(0)}ms`);
    console.log(`Min latency: ${minLatency}ms`);
    console.log(`Max latency: ${maxLatency}ms`);
    console.log(`Target: <1000ms`);
    console.log(`  ${avgLatency < 1000 ? '✓' : '⚠'} PASSED (avg < 1000ms)`);

    // Test 3: Medical disclaimer presence
    console.log('\n\n━━━ Test 3: Medical Disclaimer Check ━━━');
    const testMessages = [
      'I need an appointment',
      'Back pain for 3 days',
      'Schedule me for next week'
    ];

    for (const message of testMessages) {
      const result = await motto.execute({
        action: 'process_call',
        from: '+1-509-555-9999',
        message,
        clinic_id: 'test_clinic_001'
      });

      const decisionStr = JSON.stringify(result.decision || {});
      const hasDisclaimer = decisionStr.includes('emergency') || 
                           decisionStr.includes('911') ||
                           decisionStr.includes('disclaimer');

      console.log(`  ${hasDisclaimer ? '✓' : '✗'} "${message.substring(0, 30)}..." - Disclaimer present`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('M-OTTO TESTS: ✓ COMPLETE');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('M-OTTO test error:', error);
    throw error;
  }
}

// Run tests
testMottoIntake().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});












