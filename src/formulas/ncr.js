import { FormulaExecutor } from './executor.js';

/**
 * Formula 28: Next Contact Recommendation (NCR)
 *
 * Predicts probability customer will return in next 30 days
 * NCR = 1 - (1 / (1 + e^(-steepness × (days_since_last - inflection_point))))
 */
export class NCRFormula extends FormulaExecutor {
  constructor(version = 'v1.0') {
    const params =
      version === 'v1.1'
        ? { steepness: 0.15, inflection: 75 } // Improved version
        : { steepness: 0.1, inflection: 90 }; // Original version

    super(
      'NCR_FORMULA',
      version,
      `NCR = 1 - (1 / (1 + e^(-${params.steepness} × (days - ${params.inflection}))))`
    );

    this.steepness = params.steepness;
    this.inflection = params.inflection;
  }

  calculate(inputs) {
    const { days_since_last_visit } = inputs || {};

    if (typeof days_since_last_visit !== 'number') {
      throw new Error('Missing or invalid required input: days_since_last_visit');
    }

    const exponent = -this.steepness * (days_since_last_visit - this.inflection);
    const ncr = 1 - 1 / (1 + Math.exp(exponent));

    const roundedScore = Math.round(ncr * 100) / 100;

    return {
      ncr_score: roundedScore,
      probability: `${Math.round(ncr * 100)}%`,
      days_since_last_visit,
      recommendation: this.getRecommendation(roundedScore),
      contact_urgency: this.getUrgency(roundedScore),
      parameters: {
        steepness: this.steepness,
        inflection: this.inflection,
        version: this.version
      }
    };
  }

  getRecommendation(ncr) {
    if (ncr > 0.7) return 'contact_immediately';
    if (ncr > 0.5) return 'contact_this_week';
    if (ncr > 0.3) return 'contact_this_month';
    return 'monitor';
  }

  getUrgency(ncr) {
    if (ncr > 0.8) return 'critical';
    if (ncr > 0.6) return 'high';
    if (ncr > 0.4) return 'medium';
    return 'low';
  }
}

export default NCRFormula;
