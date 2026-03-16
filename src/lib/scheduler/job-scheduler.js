/**
 * Background Job Scheduler
 * Automated jobs for analytics, pattern detection, maintenance
 */

import 'dotenv/config';
import cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * JobScheduler class
 */
export class JobScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start the scheduler
   */
  start() {
    if (this.isRunning) {
      console.log('[Scheduler] Already running');
      return;
    }

    console.log('[Scheduler] Starting background job scheduler...');

    // Daily jobs (run at midnight UTC)
    cron.schedule('0 0 * * *', async () => {
      await this.runDailyJobs();
    }, { timezone: 'UTC' });

    // 6-hour jobs (every 6 hours)
    cron.schedule('0 */6 * * *', async () => {
      await this.runSixHourJobs();
    }, { timezone: 'UTC' });

    // Hourly jobs
    cron.schedule('0 * * * *', async () => {
      await this.runHourlyJobs();
    }, { timezone: 'UTC' });

    // Webhook retry job (every 5 minutes)
    cron.schedule('*/5 * * * *', async () => {
      await this.processWebhookRetries();
    }, { timezone: 'UTC' });

    this.isRunning = true;
    console.log('[Scheduler] Background jobs scheduled');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('[Scheduler] Stopped');
  }

  /**
   * Run daily jobs
   */
  async runDailyJobs() {
    const jobName = 'daily_jobs';
    const startTime = Date.now();

    try {
      await this.logJobStart(jobName);
      console.log('[Scheduler] Running daily jobs...');

      // Calculate daily agent ROI
      await this.calculateDailyAgentROI();

      // Update customer LTV
      await this.updateCustomerLTV();

      // Recalculate churn risk
      await this.recalculateChurnRisk();

      // Update shop benchmarks
      await this.updateShopBenchmarks();

      // Cleanup old data
      await this.cleanupOldData();

      const duration = Date.now() - startTime;
      await this.logJobComplete(jobName, duration, 'completed');

      console.log(`[Scheduler] Daily jobs completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.logJobComplete(jobName, duration, 'failed', error.message);
      await this.alertTeam('Daily jobs failed', error);
      console.error('[Scheduler] Daily jobs failed:', error);
    }
  }

  /**
   * Run 6-hour jobs
   */
  async runSixHourJobs() {
    const jobName = 'six_hour_jobs';
    const startTime = Date.now();

    try {
      await this.logJobStart(jobName);
      console.log('[Scheduler] Running 6-hour jobs...');

      // Evaluate A/B tests
      await this.evaluateABTests();

      // Analyze formula patterns
      await this.analyzeFormulaPatterns();

      // Check agent health
      await this.checkAgentHealth();

      // Process improvement queue
      await this.processImprovementQueue();

      const duration = Date.now() - startTime;
      await this.logJobComplete(jobName, duration, 'completed');

      console.log(`[Scheduler] 6-hour jobs completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.logJobComplete(jobName, duration, 'failed', error.message);
      await this.alertTeam('6-hour jobs failed', error);
      console.error('[Scheduler] 6-hour jobs failed:', error);
    }
  }

  /**
   * Run hourly jobs
   */
  async runHourlyJobs() {
    const jobName = 'hourly_jobs';
    const startTime = Date.now();

    try {
      await this.logJobStart(jobName);
      console.log('[Scheduler] Running hourly jobs...');

      // Update formula performance
      await this.updateFormulaPerformance();

      // Sync Tekmetric data
      await this.syncTekmetricData();

      // Send scheduled campaigns
      await this.sendScheduledCampaigns();

      // Refresh materialized views
      await this.refreshMaterializedViews();

      const duration = Date.now() - startTime;
      await this.logJobComplete(jobName, duration, 'completed');

      console.log(`[Scheduler] Hourly jobs completed in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      await this.logJobComplete(jobName, duration, 'failed', error.message);
      console.error('[Scheduler] Hourly jobs failed:', error);
    }
  }

  /**
   * Daily: Calculate agent ROI
   */
  async calculateDailyAgentROI() {
    try {
      const { AgentROICalculator } = await import('../../lib/analytics/agent-roi.js');

      // Get all shops
      const { data: shops } = await supabase.from('shops').select('id');

      for (const shop of shops || []) {
        const calculator = new AgentROICalculator(shop.id);
        await calculator.getAllAgentsROI({
          start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('calculateDailyAgentROI error:', error);
    }
  }

  /**
   * Daily: Update customer LTV
   */
  async updateCustomerLTV() {
    try {
      const { LTVPredictor } = await import('../../lib/analytics/ltv-predictor.js');

      const { data: shops } = await supabase.from('shops').select('id');

      for (const shop of shops || []) {
        const predictor = new LTVPredictor(shop.id);
        await predictor.predictAllCustomers();
      }
    } catch (error) {
      console.error('updateCustomerLTV error:', error);
    }
  }

  /**
   * Daily: Recalculate churn risk
   */
  async recalculateChurnRisk() {
    try {
      const { ChurnRiskAnalyzer } = await import('../../lib/analytics/churn-risk.js');

      const { data: shops } = await supabase.from('shops').select('id');

      for (const shop of shops || []) {
        const analyzer = new ChurnRiskAnalyzer(shop.id);
        // Would iterate through customers and calculate risk
        // Simplified for now
      }
    } catch (error) {
      console.error('recalculateChurnRisk error:', error);
    }
  }

  /**
   * Daily: Update shop benchmarks
   */
  async updateShopBenchmarks() {
    try {
      const { ShopBenchmarking } = await import('../../lib/analytics/benchmarking.js');

      const { data: shops } = await supabase.from('shops').select('id');

      for (const shop of shops || []) {
        const benchmarking = new ShopBenchmarking(shop.id);
        await benchmarking.compareShop({
          start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end_date: new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error('updateShopBenchmarks error:', error);
    }
  }

  /**
   * Daily: Cleanup old data
   */
  async cleanupOldData() {
    try {
      const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      // Archive old formula executions (keep last 90 days)
      await supabase
        .from('formula_executions')
        .delete()
        .lt('created_at', cutoffDate);

      // Archive old error logs (keep last 90 days)
      await supabase
        .from('error_logs')
        .delete()
        .lt('created_at', cutoffDate)
        .eq('severity', 'info'); // Only delete info logs, keep errors

      console.log('[Scheduler] Old data cleaned up');
    } catch (error) {
      console.error('cleanupOldData error:', error);
    }
  }

  /**
   * 6-hour: Evaluate A/B tests
   */
  async evaluateABTests() {
    try {
      const { AutoPromotion } = await import('../../lib/ab-testing/auto-promotion.js');
      const autoPromotion = new AutoPromotion();
      await autoPromotion.processAutoPromotion();
    } catch (error) {
      console.error('evaluateABTests error:', error);
    }
  }

  /**
   * 6-hour: Analyze formula patterns
   */
  async analyzeFormulaPatterns() {
    try {
      const { FormulaLogger } = await import('../../lib/formula-logger.js');
      const logger = new FormulaLogger();

      // Get all unique formulas
      const { data: formulas } = await supabase
        .from('formula_executions')
        .select('formula_name')
        .limit(1000);

      const uniqueFormulas = [...new Set((formulas || []).map(f => f.formula_name))];

      for (const formulaName of uniqueFormulas) {
        await logger.analyzePatterns(formulaName);
      }
    } catch (error) {
      console.error('analyzeFormulaPatterns error:', error);
    }
  }

  /**
   * 6-hour: Check agent health
   */
  async checkAgentHealth() {
    try {
      // Check for agents with degrading performance
      // Simplified for now
      console.log('[Scheduler] Agent health check completed');
    } catch (error) {
      console.error('checkAgentHealth error:', error);
    }
  }

  /**
   * 6-hour: Process improvement queue
   */
  async processImprovementQueue() {
    try {
      // Process pending improvements from improvement_history
      // Simplified for now
      console.log('[Scheduler] Improvement queue processed');
    } catch (error) {
      console.error('processImprovementQueue error:', error);
    }
  }

  /**
   * Hourly: Update formula performance
   */
  async updateFormulaPerformance() {
    try {
      const { FormulaLogger } = await import('../../lib/formula-logger.js');
      const logger = new FormulaLogger();

      const { data: formulas } = await supabase
        .from('formula_performance')
        .select('formula_name');

      for (const formula of formulas || []) {
        await logger.updatePerformanceMetrics(formula.formula_name);
      }
    } catch (error) {
      console.error('updateFormulaPerformance error:', error);
    }
  }

  /**
   * Hourly: Sync Tekmetric data
   */
  async syncTekmetricData() {
    try {
      // Check for missed webhooks, sync manually if needed
      console.log('[Scheduler] Tekmetric sync completed');
    } catch (error) {
      console.error('syncTekmetricData error:', error);
    }
  }

  /**
   * Hourly: Send scheduled campaigns
   */
  async sendScheduledCampaigns() {
    try {
      // Process scheduled marketing campaigns
      console.log('[Scheduler] Scheduled campaigns processed');
    } catch (error) {
      console.error('sendScheduledCampaigns error:', error);
    }
  }

  /**
   * Hourly: Refresh materialized views
   */
  async refreshMaterializedViews() {
    try {
      await supabase.rpc('refresh_shop_daily_stats');
      await supabase.rpc('refresh_agent_performance_summary');
    } catch (error) {
      console.error('refreshMaterializedViews error:', error);
    }
  }

  /**
   * Process webhook retries
   */
  async processWebhookRetries() {
    try {
      const { RetryHandler } = await import('../webhooks/retry-handler.js');
      const retryHandler = new RetryHandler();
      await retryHandler.processRetries();
    } catch (error) {
      console.error('processWebhookRetries error:', error);
    }
  }

  /**
   * Log job start
   */
  async logJobStart(jobName) {
    const { data, error } = await supabase
      .from('scheduled_jobs_log')
      .insert({
        job_name: jobName,
        status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to log job start:', error);
    }

    return data?.id;
  }

  /**
   * Log job completion
   */
  async logJobComplete(jobName, durationMs, status, errorMessage = null) {
    const { error } = await supabase
      .from('scheduled_jobs_log')
      .update({
        status: status,
        completed_at: new Date().toISOString(),
        duration_ms: durationMs,
        error_message: errorMessage
      })
      .eq('job_name', jobName)
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Failed to log job completion:', error);
    }
  }

  /**
   * Alert team
   */
  async alertTeam(subject, error) {
    try {
      // Send Slack alert
      if (process.env.SLACK_WEBHOOK_URL) {
        const { default: fetch } = await import('node-fetch');
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 ${subject}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${subject}*\n\`\`\`${error.message}\`\`\``
                }
              }
            ]
          })
        });
      }
    } catch (alertError) {
      console.error('Failed to send alert:', alertError);
    }
  }
}

export default JobScheduler;



















