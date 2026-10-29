import nodemailer from 'nodemailer';
import { z } from 'zod';
export interface TransactionalMail {
  email: string;
  subject: string;
  text: string;
  messageId?: string;
}
export interface MessageMailer {
  readonly available: boolean;
  send(mail: TransactionalMail): Promise<void>;
  verify?(): Promise<void>;
}
export function createSmtpMessageMailer(config: NodeJS.ProcessEnv = process.env): MessageMailer {
  const parsed = z
    .object({
      SMTP_HOST: z.string().min(1),
      SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
      SMTP_USER: z.string().min(1),
      SMTP_PASSWORD: z.string().min(1),
      EMAIL_FROM_ADDRESS: z.email(),
      EMAIL_FROM_NAME: z.string().max(120).default('NextVN'),
      SMTP_SECURE: z.enum(['true', 'false']).optional(),
    })
    .safeParse(config);
  const available =
    parsed.success &&
    config.NODE_ENV !== 'test' &&
    (!(config.TRANSACTIONAL_EMAIL_PROVIDER ?? config.INVITATION_EMAIL_PROVIDER) ||
      (config.TRANSACTIONAL_EMAIL_PROVIDER ?? config.INVITATION_EMAIL_PROVIDER) === 'smtp');
  function transportForConfig() {
    if (!available || !parsed.success) throw new Error('INVITATIONS_NOT_CONFIGURED');
    const c = parsed.data;
    return nodemailer.createTransport({
      host: c.SMTP_HOST,
      port: c.SMTP_PORT,
      secure: c.SMTP_SECURE ? c.SMTP_SECURE === 'true' : c.SMTP_PORT === 465,
      requireTLS: true,
      auth: { user: c.SMTP_USER, pass: c.SMTP_PASSWORD },
      connectionTimeout: 8000,
      greetingTimeout: 6000,
      socketTimeout: 8000,
      logger: false,
      debug: false,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  return {
    available,
    async verify() {
      const transport = transportForConfig();
      try {
        await transport.verify();
      } finally {
        transport.close();
      }
    },
    async send(mail) {
      if (!parsed.success) throw new Error('INVITATIONS_NOT_CONFIGURED');
      const c = parsed.data,
        transport = transportForConfig();
      try {
        const result = await transport.sendMail({
          from: { name: c.EMAIL_FROM_NAME, address: c.EMAIL_FROM_ADDRESS },
          to: mail.email,
          messageId: mail.messageId,
          subject: mail.subject,
          text: mail.text,
        });
        if (!result.accepted.length || result.rejected.length)
          throw new Error('RECIPIENT_REJECTED');
      } finally {
        transport.close();
      }
    },
  };
}
