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
  return process.env.RESEND_FROM || 'WholesaleIQ <deals@wholesaleiq.com>';
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
              <p style="margin:4px 0 0; color:rgba(255,255,255,0.7); font-size:14px;">WholesaleIQ</p>
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
                <strong style="color:#1A3C34;">WholesaleIQ Team</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#F3F4F6; padding:16px 32px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9CA3AF;">
                WholesaleIQ • Wholesale Real Estate Deals<br />
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

— WholesaleIQ Team`;
}
