import { FormulaExecutor } from './executor.js';

/**
 * Formula: Long-Term Customer Value (LTV)
 *
 * Code: LTV_CALCULATION (a.k.a. LTV_IMPACT)
 *
 * LTV ≈ (avg_annual_revenue × gross_margin × retention_rate × years)
 *       / (1 + discount_rate)^(years / 2)
 */
export class LTVFormula extends FormulaExecutor {
  constructor() {
    super(
      'LTV_CALCULATION',
      'v1.0',
      'LTV = (AAR × GM × RR × Y) / (1 + d)^(Y/2)'
    );
  }

  /**
   * Calculate long-term customer value and segment the customer.
   *
   * @param {Object} inputs
   * @param {number} inputs.avg_annual_revenue - Average annual revenue from the customer
   * @param {number} inputs.gross_margin - Gross margin fraction (0-1)
   * @param {number} inputs.retention_rate - Annual retention probability (0-1)
   * @param {number} [inputs.years=5] - Planning horizon in years
   * @param {number} [inputs.discount_rate=0.1] - Discount rate (0-1)
   */
  // eslint-disable-next-line class-methods-use-this
  calculate(inputs = {}) {
    const {
      avg_annual_revenue,
      gross_margin,
      retention_rate,
      years = 5,
      discount_rate = 0.1
    } = inputs;

    if (typeof avg_annual_revenue !== 'number' || avg_annual_revenue < 0) {
      throw new Error(
        'Missing or invalid required input: avg_annual_revenue (must be >= 0)'
      );
    }

    if (typeof gross_margin !== 'number' || gross_margin < 0 || gross_margin > 1) {
      throw new Error(
        'Missing or invalid required input: gross_margin (must be between 0 and 1)'
      );
    }

    if (typeof retention_rate !== 'number' || retention_rate < 0 || retention_rate > 1) {
      throw new Error(
        'Missing or invalid required input: retention_rate (must be between 0 and 1)'
      );
    }

    if (typeof years !== 'number' || years <= 0) {
      throw new Error('Invalid input: years must be > 0');
    }

    if (typeof discount_rate !== 'number' || discount_rate < 0 || discount_rate >= 1) {
      throw new Error('Invalid input: discount_rate must be between 0 and 1');
    }

    const numerator = avg_annual_revenue * gross_margin * retention_rate * years;
    const denominator = Math.pow(1 + discount_rate, years / 2);
    const ltvRaw = denominator === 0 ? 0 : numerator / denominator;

    const ltv = Math.round(ltvRaw);
    const segment = this.getSegment(ltvRaw);

    return {
      ltv,
      segment,
      retention_priority: this.getRetentionPriority(segment),
      annual_value: Math.round(ltv / years),
      components: {
        avg_annual_revenue,
        gross_margin,
        retention_rate,
        years,
        discount_rate
      },
      color: this.getColor(segment)
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getSegment(ltvValue) {
    if (ltvValue > 4000) return 'high_value';
    if (ltvValue > 2000) return 'medium_value';
    return 'low_value';
  }

  // eslint-disable-next-line class-methods-use-this
  getRetentionPriority(segment) {
    if (segment === 'high_value') return 'maximum';
    if (segment === 'medium_value') return 'standard';
    return 'automated';
  }

  // eslint-disable-next-line class-methods-use-this
  getColor(segment) {
    if (segment === 'high_value') return 'gold';
    if (segment === 'medium_value') return 'silver';
    return 'bronze';
  }
}

export default LTVFormula;




















