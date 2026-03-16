import { CLVFormula } from './clv.js';
import { NCRFormula } from './ncr.js';
import { MarginFormula } from './margin.js';
import { ChurnPredictionFormula } from './churn.js';
import { LTVFormula } from './ltv.js';
import { ServiceIntervalFormula } from './service-interval.js';
import { UpsellProbabilityFormula } from './upsell.js';

/**
 * Central registry of all formulas.
 *
 * Cursor / agents can extend this registry with additional
 * formulas (Margin Calculator, Churn Prediction, etc.).
 *
 * Keys are the formula codes used by agents and UI.
 * Multiple keys may map to the same implementation to support aliases.
 */
export const FormulaRegistry = {
  // Customer value / retention
  CLV_CALCULATION: CLVFormula,
  LTV_CALCULATION: LTVFormula,
  LTV_IMPACT: LTVFormula,
  NCR_FORMULA: NCRFormula,
  REX_CHURN_RISK: ChurnPredictionFormula,
  CHURN_PREDICTION: ChurnPredictionFormula,

  // Pricing / margin
  GROSS_MARGIN: MarginFormula,
  MARGIN_CALCULATOR: MarginFormula,

  // Service / scheduling
  NEXT_SERVICE_PREDICTION: ServiceIntervalFormula,
  SERVICE_INTERVAL_PREDICTION: ServiceIntervalFormula,

  // Upsell
  UPSELL_PROBABILITY: UpsellProbabilityFormula
};

/**
 * Get a formula instance by name.
 */
export function getFormula(name, version = 'v1.0') {
  const FormulaClass = FormulaRegistry[name];
  if (!FormulaClass) {
    throw new Error(`Formula not found: ${name}`);
  }
  return new FormulaClass(version);
}

/**
 * Execute any registered formula and create an execution artifact.
 */
export async function executeFormula(name, inputs, context = {}) {
  const formula = getFormula(name, context.version || 'v1.0');
  return formula.execute(inputs, context);
}

export default {
  FormulaRegistry,
  getFormula,
  executeFormula
};
