import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface WelcomeMailPayload {
  name: string;
  email: string;
  password: string;
}

export interface MailResult {
  success: boolean;
  error?: string;
}
export interface VerificationMailPayload {
  name: string;
  email: string;
  verificationUrl: string;
}

// Simple regex — good enough for admin-submitted emails; catches obvious bad formats
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private mailerService: MailerService) {}

  // ─── Validate email format before trying to send ─────────────────────────────
  validateEmail(email: string): { valid: boolean; message?: string } {
    if (!email || email.trim() === '') {
      return { valid: false, message: 'Email address is required.' };
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      return {
        valid: false,
        message: `"${email}" is not a valid email address. Please check and try again.`,
      };
    }
    return { valid: true };
  }

  // ─── Send welcome email ───────────────────────────────────────────────────────
  async sendWelcomeEmail(payload: WelcomeMailPayload): Promise<MailResult> {
    // Client-side format check first
    const validation = this.validateEmail(payload.email);
    if (!validation.valid) {
      return { success: false, error: validation.message };
    }

    try {
      await this.mailerService.sendMail({
        to: payload.email,
        subject: 'Welcome to the Platform — Your Account Details',
        template: 'welcome',          // views/emails/welcome.ejs
        context: {
          name: payload.name,
          email: payload.email,
          password: payload.password,
        },
      });

      this.logger.log(`Welcome email sent to ${payload.email}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.email}`, error);

      // Translate nodemailer / SMTP error codes into friendly messages
      const friendly = this.friendlySmtpError(error, payload.email);
      return { success: false, error: friendly };
    }
  }

  async sendVerificationEmail(payload: VerificationMailPayload): Promise<MailResult> {
  const validation = this.validateEmail(payload.email);
  if (!validation.valid) {
    return { success: false, error: validation.message };
  }

  try {
    await this.mailerService.sendMail({
      to: payload.email,
      subject: 'Verify Your Email Address',
      template: 'verify',
      context: {
        name: payload.name,
        email: payload.email,
        verificationUrl: payload.verificationUrl,
      },
    });

    this.logger.log(`Verification email sent to ${payload.email}`);
    return { success: true };
  } catch (error) {
    this.logger.error(`Failed to send verification email`, error);
    const friendly = this.friendlySmtpError(error, payload.email);
    return { success: false, error: friendly };
  }
}

  // ─── Translate SMTP errors into admin-friendly messages ──────────────────────
  private friendlySmtpError(error: any, email: string): string {
    const message: string = error?.message?.toLowerCase() ?? '';
    const code: string = error?.code ?? '';
    const responseCode: number = error?.responseCode ?? 0;

    // Log full error for debugging
    this.logger.error(error);

    // Connection refused / wrong host or port
    if (code === 'ECONNREFUSED' || code === 'ESOCKET') {
      return 'Could not connect to Mailtrap. Check that MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASS are set correctly in your .env file.';
    }

    // Timeout
    if (code === 'ETIMEDOUT') {
      return 'Connection to the mail server timed out. Please check your Mailtrap credentials and network.';
    }

    // DNS / domain not found
    if (code === 'ENOTFOUND' || message.includes('getaddrinfo') || message.includes('dns')) {
      return `The email domain for "${email}" could not be found. Please check the email address.`;
    }

    // Invalid / non-existent recipient
    if (
      responseCode === 550 || responseCode === 551 || responseCode === 553 ||
      message.includes('user unknown') ||
      message.includes('no such user') ||
      message.includes('invalid address') ||
      message.includes('does not exist')
    ) {
      return `The email address "${email}" does not exist or cannot receive mail. Please verify the address.`;
    }

    // Authentication failure
    if (responseCode === 535 || message.includes('authentication') || message.includes('invalid credentials')) {
      return 'Mail server authentication failed. Please verify your MAIL_USER and MAIL_PASS in .env.';
    }

    // Generic fallback
    return `Failed to send the welcome email to "${email}". Error: ${error?.message ?? 'Unknown error'}`;
  }
}