import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env['RESEND_API_KEY'];
    if (!apiKey) {
      throw new Error('RESEND_API_KEY non configurata');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const resend = getResendClient();
  const fromAddress = input.from ?? process.env['EMAIL_FROM'] ?? 'TouraCore <noreply@touracore.com>';

  const { data, error } = await resend.emails.send({
    from: fromAddress,
    to: input.to,
    subject: input.subject,
    html: input.html,
    replyTo: input.replyTo,
  });

  if (error) {
    throw new Error(`Errore invio email: ${error.message}`);
  }

  return { id: data?.id ?? 'unknown' };
}

// --- Template email ---

export function bookingConfirmationEmail(params: {
  guestName: string;
  propertyName: string;
  checkIn: string;
  checkOut: string;
  bookingId: string;
  totalAmount: string;
}): { subject: string; html: string } {
  return {
    subject: `Conferma prenotazione — ${params.propertyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af; font-size: 24px;">Prenotazione confermata</h1>
        <p>Gentile ${params.guestName},</p>
        <p>La sua prenotazione presso <strong>${params.propertyName}</strong> è stata confermata.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Check-in</td>
            <td style="padding: 8px 0; font-weight: 600;">${params.checkIn}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Check-out</td>
            <td style="padding: 8px 0; font-weight: 600;">${params.checkOut}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e5e7eb;">
            <td style="padding: 8px 0; color: #6b7280;">Codice</td>
            <td style="padding: 8px 0; font-weight: 600;">${params.bookingId}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #6b7280;">Totale</td>
            <td style="padding: 8px 0; font-weight: 600;">${params.totalAmount}</td>
          </tr>
        </table>
        <p style="color: #6b7280; font-size: 14px;">Grazie per aver scelto ${params.propertyName}.</p>
      </div>
    `,
  };
}

export function welcomeEmail(params: {
  userName: string;
  loginUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'Benvenuto su TouraCore',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af; font-size: 24px;">Benvenuto!</h1>
        <p>Ciao ${params.userName},</p>
        <p>Il tuo account su TouraCore è stato creato con successo.</p>
        <a href="${params.loginUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0;">
          Accedi alla piattaforma
        </a>
        <p style="color: #6b7280; font-size: 14px;">Se non hai richiesto questo account, ignora questa email.</p>
      </div>
    `,
  };
}

export function passwordResetEmail(params: {
  userName: string;
  resetUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'Reimposta la tua password — TouraCore',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1e40af; font-size: 24px;">Reimposta password</h1>
        <p>Ciao ${params.userName},</p>
        <p>Hai richiesto il ripristino della tua password.</p>
        <a href="${params.resetUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 20px 0;">
          Reimposta password
        </a>
        <p style="color: #6b7280; font-size: 14px;">Il link scade tra 1 ora. Se non hai richiesto il ripristino, ignora questa email.</p>
      </div>
    `,
  };
}
