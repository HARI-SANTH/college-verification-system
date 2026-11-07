import nodemailer from 'nodemailer';

interface FlagNotificationParams {
  studentEmail: string;
  studentName: string;
  admissionNumber: string;
  flaggedItems: Array<{ fieldOrDoc: string; reason: string }>;
}

export class MailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER || 'harisanths56@gmail.com';
    const pass = process.env.SMTP_PASS || 'rqzhjcgpeapcnhxr';

    if (host && user && pass && pass !== 'college_smtp_password') {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        console.log(`[MailService] Initialized SMTP connection to ${host}:${port}`);
      } catch (err) {
        console.warn('[MailService] Failed to initialize SMTP transporter. Falling back to logger.', err);
      }
    } else {
      console.log('[MailService] Running in DEV logger mode (SMTP credentials not yet configured).');
    }
  }

  async sendFlagNotification(params: FlagNotificationParams): Promise<boolean> {
    const { studentEmail, studentName, admissionNumber, flaggedItems } = params;

    const listHtml = flaggedItems
      .map(
        (item) =>
          `<li style="margin-bottom: 8px;"><strong>${item.fieldOrDoc}:</strong> <span style="color: #b91c1c;">${item.reason}</span></li>`
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">College Office - Admission Verification Notice</h2>
        <p>Dear <strong>${studentName}</strong> (Roll / Admission No: <strong>${admissionNumber}</strong>),</p>
        <p>The college office has reviewed your profile submission and detected mistakes or missing information that require your correction:</p>
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 8px 0; color: #991b1b;">Items requiring re-submission:</h4>
          <ul style="margin: 0; padding-left: 20px; color: #374151;">
            ${listHtml}
          </ul>
        </div>
        <p><strong>Next Steps:</strong> Please log in to your student portal or mobile app. The flagged fields have been unlocked for you to update and re-submit.</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">This is an automated notification from the College Admissions Verification Desk.</p>
      </div>
    `;

    console.log(`\n======================================================`);
    console.log(`[EMAIL DISPATCH] To: ${studentEmail} | Subject: Admission Data Correction Required`);
    console.log(`Flagged Items:`, flaggedItems);
    console.log(`======================================================\n`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'College Office <office@college.edu>',
          to: studentEmail,
          subject: 'Action Required: Admission Data Verification Correction',
          html,
        });
        console.log(`[MailService] Email successfully delivered to ${studentEmail}`);
        return true;
      } catch (err) {
        console.error(`[MailService] Failed to send email to ${studentEmail}:`, err);
        return false;
      }
    }

    return true;
  }

  async sendPasswordResetOtp(params: { studentEmail: string; studentName: string; otp: string }): Promise<boolean> {
    const { studentEmail, studentName, otp } = params;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #1e3a8a; margin: 0;">Baselios Poulose II Catholicose College</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Student Portal - Password Recovery</p>
        </div>
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>We received a request to reset your password. Use the following One-Time Password (OTP) to complete your password reset:</p>
        <div style="background-color: #eff6ff; border: 1px dashed #3b82f6; border-radius: 8px; text-align: center; padding: 16px; margin: 20px 0;">
          <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e3a8a;">${otp}</span>
          <p style="color: #64748b; font-size: 11px; margin: 6px 0 0 0;">Valid for 10 minutes</p>
        </div>
        <p style="color: #475569; font-size: 13px;">If you did not request a password reset, please ignore this email or notify the college admissions cell.</p>
        <div style="border-top: 1px solid #e2e8f0; margin-top: 24px; padding-top: 12px; text-align: center; color: #94a3b8; font-size: 11px;">
          © ${new Date().getFullYear()} Baselios Poulose II Catholicose College, Piravom
        </div>
      </div>
    `;

    console.log(`\n======================================================`);
    console.log(`[PASSWORD RESET OTP] To: ${studentEmail} | OTP: ${otp}`);
    console.log(`======================================================\n`);

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || 'College Office <office@college.edu>',
          to: studentEmail,
          subject: `${otp} is your College Portal Password Reset OTP`,
          html,
        });
        console.log(`[MailService] Reset OTP successfully delivered to ${studentEmail}`);
        return true;
      } catch (err) {
        console.error(`[MailService] Failed to send OTP to ${studentEmail}:`, err);
        return false;
      }
    }

    return true;
  }
}

export const mailService = new MailService();
