import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import * as bcryptjs from 'bcryptjs';
import admin from 'firebase-admin';

import { OauthAccessTokenService } from '../oauth-access-token/oauth-access-token.service';
import { User, UserRole } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dtos/request/change-password.dto';
import { LoginDto } from './dtos/request/login.dto';
import { randomBytes, scrypt as _scrypt } from 'crypto';
import { promisify } from 'util';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';

const scrypt = promisify(_scrypt);

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private configService: ConfigService,
    private accessTokenService: OauthAccessTokenService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {
    // Uncomment on use
    // if (!admin.apps.length) {
    //   admin.initializeApp({
    //     credential: admin.credential.cert({
    //       clientEmail: configService.get<string>('FIREBASE_CLIENT_EMAIL'),
    //       projectId: configService.get<string>('FIREBASE_PROJECT_ID'),
    //       privateKey: configService.get<string>('FIREBASE_PRIVATE_KEY'),
    //     }),
    //   });
    // }
  }

  async generatejwt(id: string, email: string, userRole: string) {
    const tokenPayload = {
      sub: id,
      email: email,
      role: userRole,
    };
    return await this.jwtService.signAsync(tokenPayload);
  }

  // ─── SIGNUP WITH EMAIL VERIFICATION ──────────────────────────────────────────
  async signup(
    @Request() req,
    email: string,
    password: string,
    name: string,
  ) {
    // Check if email already exists
    const existingUser = await this.usersService.findOneByEmail(email).catch(() => null);
    if (existingUser) {
      throw new BadRequestException('Email is already in use');
    }

    // Hash password
    const salt = randomBytes(8).toString('hex');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    const hashedPassword = salt + '.' + hash.toString('hex');

    // Generate verification token (32 random bytes)
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // 24 hour expiry

    // Create user with emailVerified = false
    const user = await this.usersService.create({
      name,
      email,
      password: hashedPassword,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiry,
      role: UserRole.User, // default role
    });

    // Send verification email
    const verificationUrl = `${this.configService.get('APP_URL') || 'http://localhost:3001'}/verify/${verificationToken}`;
    
    await this.mailService.sendVerificationEmail({
      name: user.name,
      email: user.email,
      verificationUrl,
    });

    return user;
  }

  // ─── VERIFY EMAIL TOKEN ──────────────────────────────────────────────────────
  async verifyEmail(token: string): Promise<User> {
    const user = await this.usersService.findOneByVerificationToken(token);

    if (!user) {
      throw new NotFoundException('Invalid or expired verification link');
    }
    if (!user.verificationToken){
      throw new NotFoundException('Verification Token Not Found');
    }
    if (!user.verificationTokenExpiry){
      throw new NotFoundException('Verification Token Expiry Not Found');
    }

    // Check if token is expired
    if (user.verificationTokenExpiry < new Date()) {
      throw new BadRequestException('Verification link has expired. Please request a new one.');
    }

    // Mark email as verified
    user.emailVerified = true;
    user.verificationToken =  '';
    user.verificationTokenExpiry = undefined;

    await this.usersService.update(user.id, {
      emailVerified: true,
      verificationToken: '',
      verificationTokenExpiry: undefined,
    });

    return user;
  }

  // ─── RESEND VERIFICATION EMAIL ───────────────────────────────────────────────
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Generate new token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationTokenExpiry = new Date();
    verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24);

    await this.usersService.update(user.id, {
      verificationToken,
      verificationTokenExpiry,
    });

    // Send email
    const verificationUrl = `${this.configService.get('APP_URL') || 'http://localhost:3001'}/verify/${verificationToken}`;
    
    await this.mailService.sendVerificationEmail({
      name: user.name,
      email: user.email,
      verificationUrl,
    });
  }

  // ─── LOGIN (OLD METHOD) ──────────────────────────────────────────────────────
  async login(input: LoginDto) {
    const firebaseUser = await admin.auth().verifyIdToken(input.firebaseToken);

    const user = await this.usersService.findOneOrCreateByFirebaseUid(
      firebaseUser.uid,
    );
    if (!user) throw new UnauthorizedException('Invalid Credentials!');

    const accessToken = await this.accessTokenService.generateJwtToken(user);

    const userWithToken: User & { accessToken: string } = {
      ...user,
      accessToken,
    };

    return userWithToken;
  }

  // ─── VALIDATE USER (FOR LOGIN) ───────────────────────────────────────────────
  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) return null;

    // Check if email is verified
    if (!user.emailVerified) {
      throw new BadRequestException('Please verify your email before logging in');
    }

    // Verify password
    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    
    if (storedHash !== hash.toString('hex')) {
      return null;
    }

    return user;
  }

  async logout(headers: any) {
    if (!headers.authorization)
      throw new BadRequestException('No Authorization Found in Headers');
    const token = headers.authorization.split(' ')[1];
    await this.accessTokenService.revokeAccessToken(token);
    return { message: 'Logout' };
  }

  async validatePassword(
    user: User,
    password: string,
    newPassword: string | null = null,
  ) {
    const [salt, storedHash] = user.password.split('.');
    const hash = (await scrypt(password, salt, 32)) as Buffer;
    
    if (storedHash !== hash.toString('hex')) {
      throw new UnauthorizedException('Password is invalid !!!');
    }

    if (newPassword) {
      const newSalt = randomBytes(8).toString('hex');
      const newHash = (await scrypt(newPassword, newSalt, 32)) as Buffer;
      return newSalt + '.' + newHash.toString('hex');
    }

    return user.password;
  }

  async removeUser(userId: string) {
    await this.usersService.remove(userId);
    return { message: 'User Successfully Removed!!!' };
  }

  async changePassword(user: User | string, body: ChangePasswordDto) {
    const { currentPassword, confirmPassword } = body;
    if (currentPassword === confirmPassword) {
      throw new BadRequestException('Current & New Passwords cannot be same.');
    }
    if (typeof user === 'string') {
      user = await this.usersService.findOne(user);
    }
    const password = await this.validatePassword(
      user,
      currentPassword,
      confirmPassword,
    );

    await this.usersService.resetPassword(user, password);
    return { message: 'Password Changed Successfully!!!' };
  }
}