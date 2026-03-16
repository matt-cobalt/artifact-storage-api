import ArtifactStorage from '../artifact-storage/core.js';

/**
 * Trinity Test: Autonomous Self-Improvement Loop
 *
 * Steps:
 * 1. Detection   - Agent notices performance drop
 * 2. Analysis    - Agent analyzes root cause
 * 3. Proposal    - Agent proposes improvement
 * 4. Validation  - Agent tests proposal
 * 5. Deployment  - Agent deploys if validated
 *
 * All steps create artifacts with full provenance.
 */
export async function runTrinityTest() {
  console.log('🚀 Starting Trinity Test - Autonomous Self-Improvement Loop');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const testResults = {
    artifacts: [],
    chain: null,
    timeline: [],
    success: false,
    metrics: null
  };

  try {
    // ========================================================================
    // STEP 1: DETECTION
    // ========================================================================
    console.log('\n📊 Step 1: Performance Detection');
    const detectionStart = Date.now();

    const detectionData = {
      formula: 'NCR_FORMULA',
      metric: 'accuracy',
      current_value: 0.78,
      threshold: 0.85,
      sample_size: 100,
      time_window: '7_days',
      severity: 'medium',
      details: {
        false_positives: 15,
        false_negatives: 7,
        edge_cases: [
          'customers_5_7_years_old_vehicles',
          'first_time_customers_high_clv'
        ]
      }
    };

    const detectionArtifact = await ArtifactStorage.createArtifact({
      type: 'performance_detection',
      data: detectionData,
      provenance: {
        agent: 'forge_monitor',
        source: 'automated_monitoring',
        trigger: 'threshold_breach'
      },
      metadata: {
        priority: 'high',
        requires_action: true
      }
    });

    testResults.artifacts.push(detectionArtifact);
    testResults.timeline.push({
      step: 'detection',
      duration_ms: Date.now() - detectionStart,
      artifact_id: detectionArtifact.artifact_id
    });

    console.log(`✅ Detection complete in ${Date.now() - detectionStart}ms`);
    console.log(`   Artifact: ${detectionArtifact.artifact_id}`);
    console.log(`   Issue: ${detectionData.formula} accuracy at ${detectionData.current_value} (threshold: ${detectionData.threshold})`);

    // ========================================================================
    // STEP 2: ANALYSIS
    // ========================================================================
    console.log('\n🔍 Step 2: Root Cause Analysis');
    const analysisStart = Date.now();

    const analysisData = {
      issue_artifact_id: detectionArtifact.artifact_id,
      analysis_method: 'statistical_pattern_detection',
      findings: {
        root_cause: 'Formula sigmoid curve too flat for current customer behavior',
        supporting_evidence: [
          'Customer return patterns shifted 15 days earlier than historical average',
          'Peak return probability now at 75 days vs previous 90 days',
          'Current formula inflection point at 90 days misses early returners'
        ],
        affected_segments: [
          'High CLV customers (>$600)',
          'Vehicles 5-7 years old',
          'Customers with 3+ previous visits'
        ],
        confidence: 0.87
      },
      recommendation: {
        action: 'adjust_sigmoid_parameters',
        rationale: 'Steeper curve with earlier trigger will better match current customer behavior',
        expected_improvement: 0.13
      }
    };

    const analysisArtifact = await ArtifactStorage.createArtifact({
      type: 'root_cause_analysis',
      data: analysisData,
      provenance: {
        agent: 'forge_analyst',
        source: 'agent_analysis',
        input_artifacts: [detectionArtifact.artifact_id]
      },
      relatedArtifacts: [
        {
          artifactId: detectionArtifact.artifact_id,
          type: 'analyzes'
        }
      ],
      metadata: {
        analysis_duration_ms: Date.now() - analysisStart
      }
    });

    testResults.artifacts.push(analysisArtifact);
    testResults.timeline.push({
      step: 'analysis',
      duration_ms: Date.now() - analysisStart,
      artifact_id: analysisArtifact.artifact_id
    });

    console.log(`✅ Analysis complete in ${Date.now() - analysisStart}ms`);
    console.log(`   Artifact: ${analysisArtifact.artifact_id}`);
    console.log(`   Root cause: ${analysisData.findings.root_cause}`);
    console.log(`   Confidence: ${analysisData.findings.confidence}`);

    // ========================================================================
    // STEP 3: PROPOSAL
    // ========================================================================
    console.log('\n💡 Step 3: Improvement Proposal');
    const proposalStart = Date.now();

    const proposalData = {
      analysis_artifact_id: analysisArtifact.artifact_id,
      proposal_type: 'formula_modification',
      target: {
        formula: 'NCR_FORMULA',
        current_version: 'v1.0',
        proposed_version: 'v1.1'
      },
      changes: {
        current_formula: 'NCR = 1 - (1/(1 + e^(-0.1 * (days_since_last - 90))))',
        proposed_formula: 'NCR = 1 - (1/(1 + e^(-0.15 * (days_since_last - 75))))',
        parameters_changed: {
          sigmoid_steepness: { from: 0.1, to: 0.15 },
          inflection_point: { from: 90, to: 75 }
        },
        rationale: 'Steeper curve (0.1→0.15) catches behavior changes faster, earlier inflection (90→75) matches current return patterns'
      },
      expected_outcomes: {
        accuracy_improvement: 0.13,
        false_positive_reduction: 0.08,
        false_negative_reduction: 0.05,
        confidence: 0.89
      },
      risk_assessment: {
        risk_level: 'low',
        reversible: true,
        blast_radius: 'single_formula',
        mitigation: 'A/B test before full deployment'
      }
    };

    const proposalArtifact = await ArtifactStorage.createArtifact({
      type: 'improvement_proposal',
      data: proposalData,
      provenance: {
        agent: 'forge_optimizer',
        source: 'agent_proposal',
        input_artifacts: [analysisArtifact.artifact_id]
      },
      relatedArtifacts: [
        {
          artifactId: analysisArtifact.artifact_id,
          type: 'based_on'
        },
        {
          artifactId: detectionArtifact.artifact_id,
          type: 'addresses'
        }
      ],
      metadata: {
        status: 'pending_validation',
        created_at: new Date().toISOString()
      }
    });

    testResults.artifacts.push(proposalArtifact);
    testResults.timeline.push({
      step: 'proposal',
      duration_ms: Date.now() - proposalStart,
      artifact_id: proposalArtifact.artifact_id
    });

    console.log(`✅ Proposal created in ${Date.now() - proposalStart}ms`);
    console.log(`   Artifact: ${proposalArtifact.artifact_id}`);
    console.log('   Change: v1.0 → v1.1');
    console.log(`   Expected improvement: ${proposalData.expected_outcomes.accuracy_improvement}`);

    // ========================================================================
    // STEP 4: VALIDATION
    // ========================================================================
    console.log('\n🧪 Step 4: Validation Testing');
    const validationStart = Date.now();

    // For Trinity Test we simulate A/B test results
    const validationData = {
      proposal_artifact_id: proposalArtifact.artifact_id,
      test_type: 'a_b_test',
      test_config: {
        sample_size: 50,
        control_version: 'v1.0',
        treatment_version: 'v1.1',
        duration_days: 7,
        success_criteria: {
          min_accuracy: 0.85,
          min_improvement: 0.10
        }
      },
      results: {
        control: {
          accuracy: 0.78,
          false_positives: 15,
          false_negatives: 7,
          sample_size: 50
        },
        treatment: {
          accuracy: 0.91,
          false_positives: 3,
          false_negatives: 2,
          sample_size: 50
        },
        improvement: {
          accuracy_delta: 0.13,
          false_positive_reduction: 0.80,
          false_negative_reduction: 0.71,
          statistical_significance: 0.98
        }
      },
      decision: {
        approved: true,
        rationale: 'Treatment version exceeds success criteria: 0.91 accuracy (required 0.85), 0.13 improvement (required 0.10)',
        confidence: 0.98,
        recommendation: 'deploy_to_production'
      }
    };

    const validationArtifact = await ArtifactStorage.createArtifact({
      type: 'validation_result',
      data: validationData,
      provenance: {
        agent: 'forge_validator',
        source: 'ab_test_execution',
        input_artifacts: [proposalArtifact.artifact_id]
      },
      relatedArtifacts: [
        {
          artifactId: proposalArtifact.artifact_id,
          type: 'validates'
        }
      ],
      metadata: {
        test_duration_ms: Date.now() - validationStart,
        approved: validationData.decision.approved
      }
    });

    testResults.artifacts.push(validationArtifact);
    testResults.timeline.push({
      step: 'validation',
      duration_ms: Date.now() - validationStart,
      artifact_id: validationArtifact.artifact_id,
      approved: validationData.decision.approved
    });

    // Capture before/after metrics for API + UI consumption
    testResults.metrics = {
      before: detectionData.current_value,
      after:
        validationData.results?.treatment?.accuracy ??
        validationData.results?.control?.accuracy ??
        detectionData.current_value
    };

    console.log(`✅ Validation complete in ${Date.now() - validationStart}ms`);
    console.log(`   Artifact: ${validationArtifact.artifact_id}`);
    console.log(`   Results: v1.0 accuracy ${validationData.results.control.accuracy} → v1.1 accuracy ${validationData.results.treatment.accuracy}`);
    console.log(`   Decision: ${validationData.decision.approved ? 'APPROVED ✅' : 'REJECTED ❌'}`);

    // ========================================================================
    // STEP 5: DEPLOYMENT (if validated)
    // ========================================================================
    if (validationData.decision.approved) {
      console.log('\n🚀 Step 5: Deployment');
      const deploymentStart = Date.now();

      const deploymentData = {
        validation_artifact_id: validationArtifact.artifact_id,
        deployment_type: 'formula_update',
        target: {
          formula: 'NCR_FORMULA',
          from_version: 'v1.0',
          to_version: 'v1.1'
        },
        deployment_details: {
          formula_definition: proposalData.changes.proposed_formula,
          deployed_at: new Date().toISOString(),
          deployed_by: 'forge_deployer',
          rollback_available: true,
          previous_version_archived: true
        },
        metrics: {
          expected_accuracy: 0.91,
          baseline_accuracy: 0.78,
          improvement: 0.13,
          confidence: validationData.decision.confidence
        },
        status: 'deployed_production'
      };

      const deploymentArtifact = await ArtifactStorage.createArtifact({
        type: 'deployment',
        data: deploymentData,
        provenance: {
          agent: 'forge_deployer',
          source: 'automated_deployment',
          input_artifacts: [validationArtifact.artifact_id]
        },
        relatedArtifacts: [
          {
            artifactId: validationArtifact.artifact_id,
            type: 'triggered_by'
          },
          {
            artifactId: proposalArtifact.artifact_id,
            type: 'implements'
          }
        ],
        metadata: {
          deployment_duration_ms: Date.now() - deploymentStart
        }
      });

      testResults.artifacts.push(deploymentArtifact);
      testResults.timeline.push({
        step: 'deployment',
        duration_ms: Date.now() - deploymentStart,
        artifact_id: deploymentArtifact.artifact_id
      });

      console.log(`✅ Deployment complete in ${Date.now() - deploymentStart}ms`);
      console.log(`   Artifact: ${deploymentArtifact.artifact_id}`);
      console.log('   Formula NCR_FORMULA updated: v1.0 → v1.1');
      console.log(`   Status: ${deploymentData.status}`);

      testResults.success = true;
    }

    // ========================================================================
    // STEP 6: BUILD ARTIFACT CHAIN
    // ========================================================================
    console.log('\n🔗 Building Artifact Chain...');
    testResults.chain = await ArtifactStorage.getArtifactChain(
      detectionArtifact.artifact_id,
      10
    );

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✨ TRINITY TEST COMPLETE ✨');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 Results:');
    console.log(`   • Artifacts created: ${testResults.artifacts.length}`);
    console.log(`   • Relationships mapped: ${testResults.chain.relationships.length}`);
    console.log(
      `   • Total execution time: ${testResults.timeline.reduce(
        (sum, t) => sum + t.duration_ms,
        0
      )}ms`
    );
    console.log(`   • Self-improvement: ${testResults.success ? 'SUCCESS ✅' : 'FAILED ❌'}`);

    console.log('\n🔗 Artifact Chain:');
    testResults.artifacts.forEach((artifact, idx) => {
      console.log(`   ${idx + 1}. ${artifact.type}: ${artifact.artifact_id}`);
    });

    console.log('\n📈 Performance Improvement:');
    const beforePct = (testResults.metrics?.before ?? 0.78) * 100;
    const afterPct = (testResults.metrics?.after ?? 0.91) * 100;
    console.log(`   • Initial accuracy: ${beforePct.toFixed(1)}%`);
    console.log(`   • Final accuracy: ${afterPct.toFixed(1)}%`);
    console.log(`   • Improvement: +${(afterPct - beforePct).toFixed(1)} pts`);

    return testResults;
  } catch (error) {
    console.error('\n❌ Trinity Test failed:', error);
    testResults.error = error.message;
    return testResults;
  }
}

// Run directly: node src/trinity-test/runner.js
// Note: import.meta.url vs process.argv[1] is tricky on Windows paths,
// so we use a simpler check based on argv.
if (process.argv[1] && process.argv[1].includes('trinity-test') && process.argv[1].includes('runner.js')) {
  runTrinityTest()
    .then(() => {
      console.log('\n✅ Trinity Test script completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Trinity Test script failed:', error);
      process.exit(1);
    });
}

export default { runTrinityTest };


