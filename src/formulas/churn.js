import { FormulaExecutor } from './executor.js';

/**
 * Formula: Churn Risk / Prediction
 *
 * Code: REX_CHURN_RISK (a.k.a. Churn Prediction)
 *
 * churn_risk = 0.30 * recency_score
 *            + 0.25 * engagement_decline
 *            + 0.25 * satisfaction_drop
 *            + 0.20 * competitive_exposure
 */
export class ChurnPredictionFormula extends FormulaExecutor {
  constructor() {
    super(
      'REX_CHURN_RISK',
      'v1.0',
      'churn_risk = 0.30*recency + 0.25*engagement_decline + 0.25*satisfaction_drop + 0.20*competitive_exposure'
    );
  }

  /**
   * Calculate churn risk score (0-1) and provide interpretation.
   *
   * @param {Object} inputs
   * @param {number} inputs.recency_score - 0-1, higher = more recent visit
   * @param {number} inputs.engagement_decline - 0-1, higher = bigger decline
   * @param {number} inputs.satisfaction_drop - 0-1, higher = bigger drop
   * @param {number} inputs.competitive_exposure - 0-1, higher = more local competition
   */
  // eslint-disable-next-line class-methods-use-this
  calculate(inputs = {}) {
    const {
      recency_score,
      engagement_decline,
      satisfaction_drop,
      competitive_exposure
    } = inputs;

    const fields = {
      recency_score,
      engagement_decline,
      satisfaction_drop,
      competitive_exposure
    };

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value !== 'number' || value < 0 || value > 1) {
        throw new Error(
          `Missing or invalid required input: ${key} (must be a number between 0 and 1)`
        );
      }
    }

    const churnRisk =
      recency_score * 0.3 +
      engagement_decline * 0.25 +
      satisfaction_drop * 0.25 +
      competitive_exposure * 0.2;

    const roundedScore = Math.round(churnRisk * 1000) / 1000;
    const riskLevel = this.getRiskLevel(churnRisk);

    return {
      churn_risk_score: roundedScore,
      churn_risk_percentage: Math.round(churnRisk * 100),
      risk_level: riskLevel,
      recommended_action: this.getRecommendedAction(churnRisk),
      intervention_urgency_days: this.getUrgencyDays(churnRisk),
      components: fields,
      color: this.getColor(riskLevel)
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getRiskLevel(score) {
    if (score > 0.85) return 'critical';
    if (score > 0.7) return 'high';
    if (score > 0.5) return 'moderate';
    return 'low';
  }

  // eslint-disable-next-line class-methods-use-this
  getRecommendedAction(score) {
    if (score > 0.7) return 'urgent_intervention';
    if (score > 0.5) return 'retention_campaign';
    return 'monitor';
  }

  // eslint-disable-next-line class-methods-use-this
  getUrgencyDays(score) {
    if (score > 0.85) return 3;
    if (score > 0.7) return 7;
    return 14;
  }

  // eslint-disable-next-line class-methods-use-this
  getColor(riskLevel) {
    if (riskLevel === 'critical') return 'red';
    if (riskLevel === 'high') return 'orange';
    if (riskLevel === 'moderate') return 'yellow';
    return 'green';
  }
}

export default ChurnPredictionFormula;




















