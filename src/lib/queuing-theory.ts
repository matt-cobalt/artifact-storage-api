/**
 * Queuing Theory Formulas
 * 
 * M/M/c queue model: Poisson arrivals, Exponential service, c servers
 * Used for workload balancing and resource allocation
 */

/**
 * M/M/c Queue Performance Metrics
 */
export interface MMCQueueResult {
  utilization: number;          // ρ (rho) - server utilization (0.0-1.0)
  avgQueueLength: number;       // Lq - average queue length
  avgWaitTime: number;          // Wq - average wait time in queue (seconds)
  avgSystemTime: number;        // W - average time in system (seconds)
  avgSystemLength: number;      // L - average number in system
  probabilityOfWait: number;    // P(W > 0) - probability of waiting
  isStable: boolean;            // ρ < c (utilization < server count)
}

/**
 * Calculate M/M/c queue performance metrics
 * 
 * @param lambda Arrival rate (requests per second)
 * @param mu Service rate per server (requests per second per server)
 * @param c Number of servers (agents)
 */
export function mmcQueue(
  lambda: number,
  mu: number,
  c: number
): MMCQueueResult {
  if (lambda <= 0 || mu <= 0 || c <= 0) {
    throw new Error('lambda, mu, and c must be positive');
  }
  
  const rho = lambda / (c * mu);  // Utilization
  
  if (rho >= 1.0) {
    // Unstable queue
    return {
      utilization: rho,
      avgQueueLength: Infinity,
      avgWaitTime: Infinity,
      avgSystemTime: Infinity,
      avgSystemLength: Infinity,
      probabilityOfWait: 1.0,
      isStable: false
    };
  }
  
  // Probability of zero customers in system (P0)
  let p0Sum = 0;
  for (let n = 0; n < c; n++) {
    p0Sum += Math.pow(lambda / mu, n) / factorial(n);
  }
  p0Sum += (Math.pow(lambda / mu, c) / factorial(c)) * (1 / (1 - rho));
  const p0 = 1 / p0Sum;
  
  // Average queue length (Lq)
  const lq = (p0 * Math.pow(lambda / mu, c) * rho) / (factorial(c) * Math.pow(1 - rho, 2));
  
  // Average wait time in queue (Wq) - Little's Law: Lq = λ * Wq
  const wq = lq / lambda;
  
  // Average time in system (W) = Wait time + Service time
  const w = wq + (1 / mu);
  
  // Average number in system (L) - Little's Law: L = λ * W
  const l = lambda * w;
  
  // Probability of waiting (P(W > 0))
  const pw0 = (p0 * Math.pow(lambda / mu, c)) / (factorial(c) * (1 - rho));
  
  return {
    utilization: rho,
    avgQueueLength: lq,
    avgWaitTime: wq,
    avgSystemTime: w,
    avgSystemLength: l,
    probabilityOfWait: pw0,
    isStable: true
  };
}

/**
 * Helper: Factorial
 */
function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

/**
 * Little's Law: L = λ * W
 * 
 * L = average number in system
 * λ = arrival rate
 * W = average time in system
 */
export interface LittlesLaw {
  avgInSystem: number;          // L
  arrivalRate: number;          // λ
  avgTimeInSystem: number;      // W
}

export function littlesLaw(
  arrivalRate: number,
  avgTimeInSystem: number
): LittlesLaw {
  const avgInSystem = arrivalRate * avgTimeInSystem;
  
  return {
    avgInSystem,
    arrivalRate,
    avgTimeInSystem
  };
}

/**
 * Calculate optimal number of servers for target wait time
 * 
 * @param lambda Arrival rate
 * @param mu Service rate per server
 * @param targetWaitTime Target average wait time (seconds)
 */
export function findOptimalServers(
  lambda: number,
  mu: number,
  targetWaitTime: number
): number {
  let c = Math.ceil(lambda / mu) + 1;  // Start with minimum
  
  while (true) {
    try {
      const result = mmcQueue(lambda, mu, c);
      
      if (result.avgWaitTime <= targetWaitTime && result.isStable) {
        return c;
      }
      
      c++;
      
      // Safety: prevent infinite loop
      if (c > 100) {
        throw new Error('Could not find optimal server count (exceeded limit)');
      }
    } catch (error) {
      c++;
      if (c > 100) {
        throw error;
      }
    }
  }
}



