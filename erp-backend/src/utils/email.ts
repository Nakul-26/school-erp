import type { Env } from '../types';

export async function sendEmail(
  env: Env,
  { to, subject, html, text }: { to: string; subject: string; html: string; text?: string }
) {
  if (env.RESEND_API_KEY === 're_...') {
    console.log('Mock Email:', { to, subject, text: text || html });
    return { success: true, message: 'Mock email logged to console' };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ERP System <noreply@erp.yourdomain.com>', // User should configure this
      to: [to],
      subject,
      html,
      text: text || html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Resend Error:', error);
    throw new Error('Failed to send email');
  }

  return response.json();
}
