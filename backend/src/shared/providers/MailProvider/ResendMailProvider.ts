import { Resend } from 'resend';
import type { IMailProvider } from './IMailProvider';

export class ResendMailProvider implements IMailProvider {
  private readonly resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY ?? '');
  }

  async sendMail(to: string, subject: string, body: string): Promise<void> {
    const from = process.env.EMAIL_FROM;
    if (!from) {
      throw new Error('EMAIL_FROM não configurado.');
    }

    const result = await this.resend.emails.send({
      from,
      to,
      subject,
      html: body
    });

    if (result.error) {
      throw new Error(result.error.message);
    }
  }
}
