/**
 * Onboarding Email Sequence
 * Automated emails sent during onboarding process
 */

/**
 * Email templates and triggers
 */

/**
 * Send welcome email
 * @param {string} email - Recipient email
 * @param {string} shopName - Shop name
 * @param {string} activationLink - Email verification link
 */
export async function sendWelcomeEmail(email, shopName, activationLink) {
  // In production, would use email service (SendGrid, Resend, etc.)
  console.log(`[EMAIL] Welcome email to ${email}`);
  
  const template = {
    to: email,
    subject: 'Welcome to Auto Intel GTP - Let\'s Get Started',
    html: `
      <h1>Welcome to Auto Intel GTP, ${shopName}!</h1>
      <p>Thank you for signing up. Let's get your AI-powered shop management system up and running.</p>
      <p><a href="${activationLink}">Verify Your Email</a></p>
      <p>Once verified, you'll be able to connect your shop management system and activate your AI agents.</p>
    `
  };

  // await sendEmail(template);
  return { success: true, email_id: 'welcome-' + Date.now() };
}

/**
 * Send Tekmetric connection reminder
 * @param {string} email - Recipient email
 * @param {string} shopName - Shop name
 */
export async function sendTekmetricConnectionReminder(email, shopName) {
  console.log(`[EMAIL] Tekmetric connection reminder to ${email}`);
  
  const template = {
    to: email,
    subject: 'Connect Your Shop Management System',
    html: `
      <h1>Connect Tekmetric to Complete Setup</h1>
      <p>Hi ${shopName},</p>
      <p>You're almost there! Connect your Tekmetric account to start importing your shop data.</p>
      <p><a href="${process.env.APP_URL}/onboarding/connect-tekmetric">Connect Tekmetric</a></p>
      <p>Need help? Check out our <a href="${process.env.APP_URL}/help/tekmetric-setup">step-by-step guide</a>.</p>
    `
  };

  // await sendEmail(template);
  return { success: true };
}

/**
 * Send first success email
 * @param {string} email - Recipient email
 * @param {string} shopName - Shop name
 * @param {Object} agentAction - What the agent did
 */
export async function sendFirstSuccessEmail(email, shopName, agentAction) {
  console.log(`[EMAIL] First success email to ${email}`);
  
  const template = {
    to: email,
    subject: 'Your AI Just Handled Its First Task!',
    html: `
      <h1>🎉 Your AI Agent is Working!</h1>
      <p>Hi ${shopName},</p>
      <p>Great news! Your AI agent just completed its first task:</p>
      <p><strong>${agentAction.description}</strong></p>
      <p><a href="${process.env.APP_URL}/dashboard">View Dashboard</a></p>
    `
  };

  // await sendEmail(template);
  return { success: true };
}

/**
 * Send week 1 tips email
 * @param {string} email - Recipient email
 * @param {string} shopName - Shop name
 */
export async function sendWeek1TipsEmail(email, shopName) {
  console.log(`[EMAIL] Week 1 tips to ${email}`);
  
  const template = {
    to: email,
    subject: '3 Ways to Get More from Your AI Agents',
    html: `
      <h1>Power User Tips for ${shopName}</h1>
      <p>You've been using Auto Intel GTP for a week. Here are 3 ways to get even more value:</p>
      <ol>
        <li>Use OTTO for customer greetings - personalizes every interaction</li>
        <li>Set up automated workflows - agents work 24/7</li>
        <li>Review insights weekly - data-driven decisions</li>
      </ol>
      <p><a href="${process.env.APP_URL}/dashboard">Explore Dashboard</a></p>
    `
  };

  // await sendEmail(template);
  return { success: true };
}

/**
 * Send check-in email
 * @param {string} email - Recipient email
 * @param {string} shopName - Shop name
 */
export async function sendCheckInEmail(email, shopName) {
  console.log(`[EMAIL] 30-day check-in to ${email}`);
  
  const template = {
    to: email,
    subject: 'How\'s It Going? Let\'s Optimize',
    html: `
      <h1>30-Day Check-In</h1>
      <p>Hi ${shopName},</p>
      <p>You've been using Auto Intel GTP for 30 days. How's it going?</p>
      <p>We'd love to help you optimize your setup. Schedule a free consultation:</p>
      <p><a href="${process.env.APP_URL}/schedule-consultation">Schedule Consultation</a></p>
    `
  };

  // await sendEmail(template);
  return { success: true };
}

export default {
  sendWelcomeEmail,
  sendTekmetricConnectionReminder,
  sendFirstSuccessEmail,
  sendWeek1TipsEmail,
  sendCheckInEmail
};



















