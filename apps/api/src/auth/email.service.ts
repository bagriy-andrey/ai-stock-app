import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async sendPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      this.logger.warn(
        `Password reset email provider is not configured for ${email}`,
      );
      return;
    }

    this.logger.log(`Password reset link for ${email}: ${resetUrl}`);
  }
}
