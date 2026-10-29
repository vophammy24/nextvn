import { createSmtpMessageMailer } from '../lib/smtpMailer.js';
export interface InvitationMail {
  invitationId: string;
  attemptId: string;
  email: string;
  businessName: string;
  acceptUrl: string;
  expiresAt: string;
}
export interface InvitationMailer {
  readonly available: boolean;
  send(mail: InvitationMail): Promise<void>;
  verify?(): Promise<void>;
}
export function createSmtpInvitationMailer(
  config: NodeJS.ProcessEnv = process.env,
): InvitationMailer {
  const mailer = createSmtpMessageMailer({
    ...config,
    TRANSACTIONAL_EMAIL_PROVIDER:
      config.INVITATION_EMAIL_PROVIDER ?? config.TRANSACTIONAL_EMAIL_PROVIDER,
  });
  return {
    available: mailer.available,
    verify: () => mailer.verify!(),
    send: (mail) =>
      mailer.send({
        email: mail.email,
        messageId:
          '<' +
          mail.invitationId +
          '.' +
          mail.attemptId +
          '@' +
          config.EMAIL_FROM_ADDRESS?.split('@')[1] +
          '>',
        subject: 'Lời mời tham gia doanh nghiệp trên NextVN',
        text:
          'Bạn được mời tham gia ' +
          mail.businessName +
          ' trên NextVN.\nĐăng nhập hoặc đăng ký bằng email nhận thư rồi mở liên kết để chấp nhận:\n' +
          mail.acceptUrl +
          '\nLiên kết hết hạn lúc ' +
          mail.expiresAt +
          '. Nếu không mong đợi thư này, bạn có thể bỏ qua.',
      }),
  };
}
