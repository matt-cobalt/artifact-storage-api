import { FormulaExecutor } from './executor.js';

/**
 * Formula: Service Interval / Next Service Prediction
 *
 * Code: NEXT_SERVICE_PREDICTION (a.k.a. Service Interval Prediction)
 *
 * predicted_next_service_date = last_service_date + average_interval_days
 */
export class ServiceIntervalFormula extends FormulaExecutor {
  constructor() {
    super(
      'NEXT_SERVICE_PREDICTION',
      'v1.0',
      'predicted_next_service_date = last_service_date + average_interval_days'
    );
  }

  /**
   * Predict next service date and urgency.
   *
   * @param {Object} inputs
   * @param {string|Date} inputs.last_service_date - ISO date string or Date of last service
   * @param {number} inputs.average_interval_days - Average days between services
   * @param {number} [inputs.std_dev_days=7] - Variability in days between services
   * @param {string|Date} [inputs.today] - Override for "now" (useful for backtesting)
   */
  // eslint-disable-next-line class-methods-use-this
  calculate(inputs = {}) {
    const {
      last_service_date,
      average_interval_days,
      std_dev_days = 7,
      today
    } = inputs;

    if (!last_service_date) {
      throw new Error('Missing required input: last_service_date');
    }

    if (
      typeof average_interval_days !== 'number' ||
      Number.isNaN(average_interval_days) ||
      average_interval_days <= 0
    ) {
      throw new Error(
        'Missing or invalid required input: average_interval_days (must be > 0)'
      );
    }

    const lastDate = new Date(last_service_date);
    if (Number.isNaN(lastDate.getTime())) {
      throw new Error(
        'Invalid last_service_date: must be a valid ISO date string or Date value'
      );
    }

    const now = today ? new Date(today) : new Date();
    if (Number.isNaN(now.getTime())) {
      throw new Error('Invalid today value: must be a valid ISO date string or Date value');
    }

    const predictedDate = new Date(
      lastDate.getTime() + average_interval_days * 24 * 60 * 60 * 1000
    );

    const daysUntilNext = (predictedDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);

    const rawConfidence = 1 - std_dev_days / (2 * average_interval_days);
    const confidenceScore = Math.max(0.5, Math.min(0.99, rawConfidence));

    const status = this.getStatus(daysUntilNext);
    const recommendation = this.getRecommendation(status);

    return {
      predicted_next_service_date: predictedDate.toISOString().slice(0, 10),
      days_until_next_service: Math.round(daysUntilNext),
      status,
      recommendation,
      confidence_score: Math.round(confidenceScore * 100) / 100,
      components: {
        last_service_date: lastDate.toISOString().slice(0, 10),
        average_interval_days,
        std_dev_days,
        today: now.toISOString().slice(0, 10)
      }
    };
  }

  // eslint-disable-next-line class-methods-use-this
  getStatus(daysUntilNext) {
    if (daysUntilNext < 0) return 'overdue';
    if (daysUntilNext <= 30) return 'due_soon';
    return 'on_track';
  }

  // eslint-disable-next-line class-methods-use-this
  getRecommendation(status) {
    if (status === 'overdue') return 'contact_immediately';
    if (status === 'due_soon') return 'schedule_soon';
    return 'monitor';
  }
}

export default ServiceIntervalFormula;




















