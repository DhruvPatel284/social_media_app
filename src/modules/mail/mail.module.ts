import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';

import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const host = config.get<string>('MAIL_HOST');
        const port = config.get<number>('MAIL_PORT');
        const user = config.get<string>('MAIL_USER');
        const pass = config.get<string>('MAIL_PASS');

        // Debug — remove after confirming values are loaded
        console.log('── MailerModule config ──────────────────');
        console.log('MAIL_HOST :', host);
        console.log('MAIL_PORT :', port);
        console.log('MAIL_USER :', user ? user.slice(0, 6) + '…' : 'MISSING');
        console.log('MAIL_PASS :', pass ? '••••••' : 'MISSING');
        console.log('────────────────────────────────────────');

        return {
          transport: {
            host: host || 'sandbox.smtp.mailtrap.io',
            port: port || 2525,
            secure: false,            // Mailtrap uses STARTTLS, not SSL
            auth: {
              user: user,
              pass: pass,
            },
          },
          defaults: {
            from: `"${config.get('MAIL_FROM_NAME') || 'Admin Panel'}" <${config.get('MAIL_FROM') || 'noreply@admin.com'}>`,
          },
          template: {
            dir: join(process.cwd(), 'views', 'emails'),
            adapter: new EjsAdapter(),
            options: {
              strict: false,
            },
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}