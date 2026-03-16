import { FormulaExecutor } from './executor.js';

/**
 * Formula 23: Customer Lifetime Value (CLV)
 *
 * CLV = (Average Transaction Value × Purchase Frequency × Customer Lifespan) - Acquisition Cost
 */
export class CLVFormula extends FormulaExecutor {
  constructor() {
    super('CLV_CALCULATION', 'v1.0', 'CLV = (ATV × PF × CL) - AC');
  }

  calculate(inputs) {
    const {
      average_transaction_value, // Average RO total
      purchase_frequency, // Visits per year
      customer_lifespan, // Years as customer
      acquisition_cost = 50 // Default if not provided
    } = inputs || {};

    if (
      typeof average_transaction_value !== 'number' ||
      typeof purchase_frequency !== 'number' ||
      typeof customer_lifespan !== 'number'
    ) {
      throw new Error(
        'Missing or invalid required inputs: average_transaction_value, purchase_frequency, customer_lifespan'
      );
    }

    const lifetimeRevenue =
      average_transaction_value * purchase_frequency * customer_lifespan;
    const clv = lifetimeRevenue - acquisition_cost;

    return {
      clv: Math.round(clv * 100) / 100,
      components: {
        average_transaction_value,
        purchase_frequency,
        customer_lifespan,
        acquisition_cost,
        lifetime_revenue: lifetimeRevenue
      },
      interpretation: this.interpretCLV(clv)
    };
  }

  interpretCLV(clv) {
    if (clv < 0) return 'negative';
    if (clv < 300) return 'low_value';
    if (clv < 600) return 'medium_value';
    if (clv < 1000) return 'high_value';
    return 'very_high_value';
  }
}

export default CLVFormula;
