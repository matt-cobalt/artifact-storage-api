import ArtifactStorage from '../artifact-storage/core.js';

/**
 * Base formula executor.
 * All concrete formulas should extend this class and implement calculate().
 */
export class FormulaExecutor {
  constructor(formulaName, version, definition) {
    this.formulaName = formulaName;
    this.version = version;
    this.definition = definition;
  }

  /**
   * Execute a formula implementation and create an execution artifact.
   *
   * @param {Object} inputs - Raw inputs for the formula
   * @param {Object} context - Execution context / provenance
   */
  async execute(inputs, context = {}) {
    const startTime = Date.now();

    try {
      // Run the calculation implemented by subclass
      const result = this.calculate(inputs);

      const artifact = await ArtifactStorage.createArtifact({
        type: 'formula_execution',
        data: {
          formula: this.formulaName,
          version: this.version,
          definition: this.definition,
          inputs,
          outputs: result,
          execution_time_ms: Date.now() - startTime,
          context
        },
        provenance: {
          agent: context.agent || 'system',
          source: 'formula_execution',
          trigger: context.triggered_by || 'manual'
        },
        relatedArtifacts: context.relatedArtifacts || [],
        metadata: {
          formula_name: this.formulaName,
          version: this.version,
          success: true
        }
      });

      return {
        result,
        artifact,
        execution_time_ms: Date.now() - startTime
      };
    } catch (error) {
      // Log failed execution as artifact too for full observability
      await ArtifactStorage.createArtifact({
        type: 'formula_execution',
        data: {
          formula: this.formulaName,
          version: this.version,
          inputs,
          error: error.message,
          execution_time_ms: Date.now() - startTime
        },
        provenance: {
          agent: context.agent || 'system',
          source: 'formula_execution',
          trigger: context.triggered_by || 'manual'
        },
        metadata: {
          formula_name: this.formulaName,
          version: this.version,
          success: false
        }
      });

      throw error;
    }
  }

  /**
   * Concrete formulas MUST override this.
   * @param {Object} inputs
   */
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  calculate(inputs) {
    throw new Error('Must implement calculate() in formula subclass');
  }
}

export default FormulaExecutor;

