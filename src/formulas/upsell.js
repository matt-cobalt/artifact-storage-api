import { FormulaExecutor } from './executor.js';

/**
 * Formula: Upsell Probability
 *
 * Code: UPSELL_PROBABILITY
 *
 * Approximation:
 *   upsell_probability ≈ base_approval_probability
 *                        × (1 - upsell_price_ratio)
 *                        × (0.5 + 0.5 × upsell_relevance)
 */
export class UpsellProbabilityFormula extends FormulaExecutor {
  constructor() {
    super(
      'UPSELL_PROBABILITY',
      'v1.0',
      'upsell_probability ≈ base_approval × (1 - price_ratio) × (0.5 + 0.5 × relevance)'
    );
  }

  /**
   * Estimate probability that a customer will accept an upsell.
   *
   * @param {Object} inputs
   * @param {number} inputs.base_approval_probability - 0-1, base chance of approving main job
   * @param {number} inputs.upsell_relevance - 0-1, how relevant upsell is to current job
   * @param {number} inputs.upsell_price_ratio - Upsell price / base job price (e.g. 0.2 = 20%)
   */
  // eslint-disable-next-line class-methods-use-this
  calculate(inputs = {}) {
    const { base_approval_probability, upsell_relevance, upsell_price_ratio } = inputs;

    if (
      typeof base_approval_probability !== 'number' ||
      base_approval_probability < 0 ||
      base_approval_probability > 1
    ) {
      throw new Error(
        'Missing or invalid required input: base_approval_probability (must be between 0 and 1)'
      );
    }

    if (
      typeof upsell_relevance !== 'number' ||
      upsell_relevance < 0 ||
      upsell_relevance > 1
    ) {
      throw new Error(
        'Missing or invalid required input: upsell_relevance (must be between 0 and 1)'
      );
    }

    if (typeof upsell_price_ratio !== 'number' || upsell_price_ratio < 0) {
      throw new Error(
        'Missing or invalid required input: upsell_price_ratio (must be >= 0)'
      );
    }

    const priceFactor = Math.max(0, Math.min(1, 1 - upsell_price_ratio));
    const relevanceFactor = 0.5 + 0.5 * upsell_relevance; // 0.5-1.0

    let probability = base_approval_probability * priceFactor * relevanceFactor;
    probability = Math.max(0, Math.min(1, probability));

    const classification = this.getClassification(probability);

    return {
      upsell_probability: Math.round(probability * 100) / 100,
      probability_percent: Math.round(probability * 100),
      classification,
      recommendation: this.getRecommendation(classification),
      components: {
        base_approval_probability,
        upsell_relevance,
        upsell_price_ratio,
        price_factor: Math.round(priceFactor * 100) / 100,
        relevance_factor: Math.round(relevanceFactor * 100) / 100
      }
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getClassification(probability) {
    if (probability >= 0.8) return 'very_high';
    if (probability >= 0.6) return 'high';
    if (probability >= 0.4) return 'medium';
    if (probability >= 0.2) return 'low';
    return 'very_low';
  }

  // eslint-disable-next-line class-methods-use-this
  getRecommendation(classification) {
    if (classification === 'very_high' || classification === 'high') return 'must_offer';
    if (classification === 'medium') return 'offer_if_time';
    if (classification === 'low') return 'consider_other_offers';
    return 'do_not_offer';
  }
}

export default UpsellProbabilityFormula;




















