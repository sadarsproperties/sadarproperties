/**
 * Resend Email Service
 * Uses Resend REST API directly — no npm package required.
 * https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_API_URL = 'https://api.resend.com/emails';

function getApiKey() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set in environment');
  return key;
}

function getFromAddress() {
  // Resend requires a verified domain. Use env or default.
  return process.env.RESEND_FROM || 'Sadar Properties <deals@sadarproperties.com>';
}

/**
 * Send an email via Resend API.
 * @param {{ to: string|string[], subject: string, html: string, text?: string, replyTo?: string }} opts
 * @returns {Promise<{ id: string }>}
 */
export async function sendEmail({ to, subject, html, text, replyTo }) {
  const apiKey = getApiKey();
  const from = getFromAddress();

  const body = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    ...(text ? { text } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
  };

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Resend] Email send failed (${response.status}):`, errorText);
    throw new Error(`Resend API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log(`[Resend] Email sent successfully — ID: ${data.id}, To: ${Array.isArray(to) ? to.join(', ') : to}`);
  return data;
}

/**
 * Send a batch of emails (one per recipient) via Resend batch endpoint.
 * @param {Array<{ to: string, subject: string, html: string, text?: string }>} emails
 * @returns {Promise<{ data: Array<{ id: string }> }>}
 */
export async function sendBatchEmails(emails) {
  const apiKey = getApiKey();
  const from = getFromAddress();

  const payload = emails.map(email => ({
    from,
    to: [email.to],
    subject: email.subject,
    html: email.html,
    ...(email.text ? { text: email.text } : {}),
  }));

  const response = await fetch('https://api.resend.com/emails/batch', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Resend] Batch send failed (${response.status}):`, errorText);
    throw new Error(`Resend batch API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  console.log(`[Resend] Batch sent: ${emails.length} emails`);
  return data;
}

/**
 * Build a deal notification email for a buyer/investor.
 */
export function buildDealEmailHtml({ recipientName, property }) {
  const price = Number(property.price || 0).toLocaleString('en-US');
  const arv = property.arv ? Number(property.arv).toLocaleString('en-US') : 'N/A';
  const repairCosts = property.repairCosts ? Number(property.repairCosts).toLocaleString('en-US') : 'N/A';
  const assignmentFee = Number(property.assignmentFee || 10000).toLocaleString('en-US');
  const dealScore = property.dealScore != null ? property.dealScore : 'N/A';
  const location = [property.city, property.state].filter(Boolean).join(', ');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0; padding:0; background:#F9F6F1; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F1; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#1A3C34; padding:24px 32px;">
              <h1 style="margin:0; color:#F5A623; font-size:24px; font-weight:800;">🏠 New Wholesale Deal</h1>
              <p style="margin:4px 0 0; color:rgba(255,255,255,0.7); font-size:14px;">Sadar Properties</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; color:#333;">Hi ${recipientName},</p>
              <p style="margin:0 0 24px; font-size:15px; color:#555; line-height:1.5;">
                We have a new wholesale deal that matches your buy box criteria. Here are the details:
              </p>

              <!-- Property Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F1; border-radius:12px; padding:20px; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <h2 style="margin:0 0 4px; font-size:20px; color:#1A3C34; font-weight:800;">${property.address}</h2>
                    <p style="margin:0 0 16px; font-size:14px; color:#6B7280;">${location}${property.zip ? ' ' + property.zip : ''}</p>

                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB;">
                          <span style="font-size:13px; color:#6B7280;">Type</span>
                        </td>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB; text-align:right;">
                          <strong style="color:#1A3C34;">${property.propertyType || 'Residential'}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB;">
                          <span style="font-size:13px; color:#6B7280;">Asking Price</span>
                        </td>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB; text-align:right;">
                          <strong style="color:#1A3C34;">$${price}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB;">
                          <span style="font-size:13px; color:#6B7280;">ARV</span>
                        </td>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB; text-align:right;">
                          <strong style="color:#10B981;">${arv !== 'N/A' ? '$' + arv : arv}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB;">
                          <span style="font-size:13px; color:#6B7280;">Est. Repairs</span>
                        </td>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB; text-align:right;">
                          <strong style="color:#EF4444;">${repairCosts !== 'N/A' ? '$' + repairCosts : repairCosts}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB;">
                          <span style="font-size:13px; color:#6B7280;">Assignment Fee</span>
                        </td>
                        <td style="padding:8px 0; border-bottom:1px solid #E5E7EB; text-align:right;">
                          <strong style="color:#F5A623;">$${assignmentFee}</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="font-size:13px; color:#6B7280;">Deal Score</span>
                        </td>
                        <td style="padding:8px 0; text-align:right;">
                          <strong style="color:${typeof dealScore === 'number' && dealScore >= 70 ? '#10B981' : '#F5A623'};">${dealScore}/100</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px; font-size:15px; color:#555; line-height:1.5;">
                Interested? Reply to this email or reach out directly to discuss the deal and schedule a walkthrough.
              </p>

              <p style="margin:0; font-size:14px; color:#6B7280;">
                Best regards,<br />
                <strong style="color:#1A3C34;">Sadar Properties Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F3F4F6; padding:16px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9CA3AF;">
                Sadar Properties • Wholesale Real Estate Deals<br />
                You're receiving this because your buy box criteria matched this deal.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Build a plain-text fallback for the deal email.
 */
export function buildDealEmailText({ recipientName, property }) {
  const price = Number(property.price || 0).toLocaleString('en-US');
  const arv = property.arv ? Number(property.arv).toLocaleString('en-US') : 'N/A';
  const location = [property.city, property.state].filter(Boolean).join(', ');

  return `Hi ${recipientName},

New wholesale deal matching your criteria:

${property.address}
${location}${property.zip ? ' ' + property.zip : ''}

Asking: $${price}
ARV: ${arv !== 'N/A' ? '$' + arv : arv}
Type: ${property.propertyType || 'Residential'}
Deal Score: ${property.dealScore ?? 'N/A'}/100

Interested? Reply to this email to discuss.

— Sadar Properties Team`;
}

/**
 * Build a welcome email template for newly signed up users.
 */
export function buildWelcomeEmailHtml(name) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://sadarproperties-web.onrender.com';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0; padding:0; background:#F9F6F1; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F1; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#1A3C34; padding:32px; text-align:center;">
              <h1 style="margin:0; color:#F5A623; font-size:26px; font-weight:800;">🏠 Welcome to Sadar Properties</h1>
              <p style="margin:8px 0 0; color:rgba(255,255,255,0.8); font-size:16px;">Your Real Estate Wholesaling Toolkit</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px; line-height:1.6; color:#333333; font-size:15px;">
              <p style="margin:0 0 16px; font-size:18px; color:#1A3C34; font-weight:bold;">Hello ${name},</p>
              <p style="margin:0 0 20px;">
                Thank you so much for signing up! We are thrilled to welcome you to <strong>Sadar Properties</strong>.
              </p>
              
              <h3 style="color:#1A3C34; border-bottom:2px solid #F9F6F1; padding-bottom:8px; margin:24px 0 12px;">What is Sadar Properties?</h3>
              <p style="margin:0 0 16px;">
                Sadar Properties is an all-in-one real estate wholesaling toolkit designed to optimize your workflow. From lead capture to contract matching and outreach, it enables you to:
              </p>
              <ul style="margin:0 0 20px; padding-left:20px;">
                <li style="margin-bottom:8px;"><strong>Centralize Leads:</strong> Track properties, sellers, buyers, and investors in one dashboard.</li>
                <li style="margin-bottom:8px;"><strong>Calculate Deal Margins:</strong> Use our Deal Analyzer to compute Maximum Allowable Offer (MAO) and generate deal scores.</li>
                <li style="margin-bottom:8px;"><strong>Automate Matching:</strong> Automatically match property deals with your buyers' and investors' buy-box criteria.</li>
                <li style="margin-bottom:8px;"><strong>AI-Powered Lead Capture:</strong> Instantly extract contact info and buy boxes from text, emails, or property page URLs using integrated LLMs.</li>
              </ul>

              <h3 style="color:#1A3C34; border-bottom:2px solid #F9F6F1; padding-bottom:8px; margin:24px 0 12px;">How to Use the Web App</h3>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td valign="top" style="padding-right:12px; font-size:18px; font-weight:bold; color:#F5A623;">1.</td>
                  <td style="padding-bottom:12px;">
                    <strong>Seed Sample Data:</strong> When you first log in, click the <em>"Load Sample Data"</em> button on the dashboard to populate your account with initial listings and contacts.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="padding-right:12px; font-size:18px; font-weight:bold; color:#F5A623;">2.</td>
                  <td style="padding-bottom:12px;">
                    <strong>Analyze Deals:</strong> Navigate to the <em>"Deal Analyzer"</em> to test real estate math. Set repair estimates and assignment fees to see if a deal works.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="padding-right:12px; font-size:18px; font-weight:bold; color:#F5A623;">3.</td>
                  <td style="padding-bottom:12px;">
                    <strong>Match & Notify Buyers:</strong> Click <em>"Auto-Match"</em> on any property to see matching buyers. Then, trigger custom email alerts directly to their inbox with a single click.
                  </td>
                </tr>
                <tr>
                  <td valign="top" style="padding-right:12px; font-size:18px; font-weight:bold; color:#F5A623;">4.</td>
                  <td style="padding-bottom:12px;">
                    <strong>Extract Leads with AI:</strong> Go to the <em>"Lead Capture"</em> tab, paste an investor email thread or Zillow URL, and watch the AI extract full details into a structured format.
                  </td>
                </tr>
              </table>

              <p style="margin:24px 0 0; text-align:center;">
                <a href="${frontendUrl}/dashboard" style="background:#1A3C34; color:#ffffff; padding:12px 24px; text-decoration:none; border-radius:8px; font-weight:bold; display:inline-block;">Go to Dashboard</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F3F4F6; padding:20px; text-align:center; font-size:12px; color:#6B7280;">
              Sadar Properties • The Wholesaler's Secret Weapon<br />
              Need support? Contact us at <a href="mailto:Propertiesbysardar@gmail.com" style="color:#1A3C34; text-decoration:underline;">Propertiesbysardar@gmail.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export function buildWelcomeEmailText(name) {
  const frontendUrl = process.env.FRONTEND_URL || 'https://sadarproperties-web.onrender.com';
  return `Hi ${name},

Welcome to Sadar Properties — your real estate wholesaling toolkit!

Sadar Properties is designed to streamline your real estate wholesaling workflow. Here is what you can do:
1. Centralize Leads: Manage properties, sellers, buyers, and investors.
2. Calculate Deal Margins: Estimate repairs, calculate MAO, and analyze deals.
3. Automate Matching: Match properties against buyers' specific criteria in real time.
4. AI Lead Capture: Extract contacts and buy boxes instantly from text or URLs.

HOW TO USE THE APP:
1. Seed Sample Data: Click "Load Sample Data" on the dashboard when you first log in.
2. Analyze Deals: Use the Deal Analyzer to evaluate properties.
3. Match & Notify: Use Auto-Match on any property and email deals directly to buyers.
4. Extract with AI: Navigate to Lead Capture to turn raw text/URLs into structured buyer records.

Log in here: ${frontendUrl}/dashboard

Best regards,
The Sadar Properties Team`;
}

/**
 * Send welcome email to a new user. Fails gracefully.
 */
export async function sendWelcomeEmail(userEmail, userName) {
  const html = buildWelcomeEmailHtml(userName);
  const text = buildWelcomeEmailText(userName);
  try {
    await sendEmail({
      to: userEmail,
      subject: 'Welcome to Sadar Properties! 🏠',
      html,
      text
    });
  } catch (err) {
    console.error(`[Welcome Email Error] Failed to send to ${userEmail}:`, err.message);
    console.log(`[Welcome Email Log Fallback]
========================================
Subject: Welcome to Sadar Properties!
To: ${userEmail}
Name: ${userName}
Text Content:
${text}
========================================`);
  }
}

/**
 * Send activity notification to a user's email. Fails gracefully.
 */
export async function sendActivityNotification({ userEmail, userName, activityName, detailsHtml, detailsText }) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0; padding:0; background:#F9F6F1; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F1; padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#1A3C34; padding:20px 32px;">
              <h1 style="margin:0; color:#F5A623; font-size:20px; font-weight:800;">🔔 Activity Notification</h1>
              <p style="margin:4px 0 0; color:rgba(255,255,255,0.7); font-size:13px;">Sadar Properties Activity Tracker</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px; line-height:1.6; color:#333333; font-size:15px;">
              <p style="margin:0 0 16px;">Hello ${userName},</p>
              <p style="margin:0 0 24px;">
                This is a notification that a new activity has been performed in your <strong>Sadar Properties</strong> account.
              </p>

              <!-- Activity Details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F6F1; border-radius:12px; padding:20px; margin-bottom:24px;">
                <tr>
                  <td>
                    <h3 style="margin:0 0 12px; color:#1A3C34; font-size:16px; border-bottom:1px solid #E5E7EB; padding-bottom:8px;">
                      Activity: ${activityName}
                    </h3>
                    <div style="font-size:14px; color:#4B5563;">
                      ${detailsHtml}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:13px; color:#6B7280;">
                If you did not perform this action, please review your account activity or contact support.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F3F4F6; padding:16px; text-align:center; font-size:11px; color:#9CA3AF;">
              Sadar Properties • Activity logs are sent automatically to keep you informed.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const text = `Hello ${userName},

This is a notification of activity in your Sadar Properties account:
Activity: ${activityName}

${detailsText}

— Sadar Properties Team`;

  try {
    await sendEmail({
      to: userEmail,
      subject: `[Sadar Activity] ${activityName}`,
      html,
      text,
    });
  } catch (err) {
    console.error(`[Activity Email Error] Failed to send notification to ${userEmail}:`, err.message);
    console.log(`[Activity Email Log Fallback]
========================================
Subject: [Sadar Activity] ${activityName}
To: ${userEmail}
Name: ${userName}
Text Content:
${detailsText}
========================================`);
  }
}
