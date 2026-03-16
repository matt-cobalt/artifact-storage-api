import { FormulaExecutor } from './executor.js';

/**
 * Formula: Gross Margin Calculator
 *
 * Code: GROSS_MARGIN (a.k.a. Margin Calculator)
 *
 * Margin % = (Revenue - COGS - Overhead) / (Revenue - Discounts)
 */
export class MarginFormula extends FormulaExecutor {
  constructor() {
    super(
      'GROSS_MARGIN',
      'v1.0',
      'Margin % = (Revenue - COGS - Overhead) / (Revenue - Discounts)'
    );
  }

  /**
   * Calculate gross margin and provide interpretation.
   *
   * @param {Object} inputs
   * @param {number} inputs.revenue - Total billed amount (including parts + labor)
   * @param {number} inputs.cost_of_goods_sold - Direct cost of parts + labor
   * @param {number} [inputs.discounts=0] - Any discounts applied to the ticket
   * @param {number} [inputs.overhead_allocated=0] - Allocated overhead cost
   */
  // eslint-disable-next-line class-methods-use-this
  calculate(inputs = {}) {
    const {
      revenue,
      cost_of_goods_sold,
      discounts = 0,
      overhead_allocated = 0
    } = inputs;

    if (typeof revenue !== 'number' || revenue <= 0) {
      throw new Error('Missing or invalid required input: revenue (must be > 0)');
    }

    if (typeof cost_of_goods_sold !== 'number' || cost_of_goods_sold < 0) {
      throw new Error(
        'Missing or invalid required input: cost_of_goods_sold (must be >= 0)'
      );
    }

    if (typeof discounts !== 'number' || typeof overhead_allocated !== 'number') {
      throw new Error(
        'Invalid optional inputs: discounts and overhead_allocated must be numbers'
      );
    }

    const effectiveRevenue = revenue - discounts;
    const totalCosts = cost_of_goods_sold + overhead_allocated;
    const marginDollars = effectiveRevenue - totalCosts;

    const marginFraction = effectiveRevenue === 0 ? 0 : marginDollars / effectiveRevenue;

    const marginPercentage = Math.round(marginFraction * 1000) / 10; // one decimal place

    return {
      margin_percentage: marginPercentage, // e.g. 42.3 (% margin)
      margin_dollars: Math.round(marginDollars * 100) / 100,
      components: {
        revenue,
        discounts,
        effective_revenue: effectiveRevenue,
        cost_of_goods_sold,
        overhead_allocated,
        total_costs: totalCosts
      },
      interpretation: this.interpretMargin(marginFraction)
    };
  }

  // eslint-disable-next-line class-methods-use-this
  interpretMargin(marginFraction) {
    if (marginFraction < 0) return 'negative_margin';
    if (marginFraction < 0.3) return 'below_target'; // <30% margin
    if (marginFraction < 0.5) return 'healthy'; // 30-50%
    return 'premium'; // >=50%
  }
}

export default MarginFormula;




















