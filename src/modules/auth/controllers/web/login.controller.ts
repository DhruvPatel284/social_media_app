import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Req,
  Res,
  Session,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UserRole } from 'src/modules/users/user.entity';
import { AuthGuard } from '../../../../common/guards/auth.guard';
import { AuthService } from '../../auth.service';
import { LoginWebDto } from '../../dtos/request/login-web.dto';
import { UsersService } from 'src/modules/users/users.service';

@Controller()
export class LoginController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  // ─── SIGNUP ROUTES ───────────────────────────────────────────────────────────

  @Get('signup')
  loadSignupView(@Res() res: Response, @Req() req: Request) {
    return res.render('pages/auth/signup', {
      title: 'Signup',
      page_title: 'Signup',
      folder: 'Authentication',
      layout: 'layouts/layout-without-nav',
      errors: req.flash('errors')[0] || null,  // Changed to null
      success: req.flash('success')[0] || null,
      old: req.flash('old')[0] || null,
    });
  }

  @Post('signup')
  async signup(@Session() session, @Body() body, @Req() req: Request, @Res() res: Response) {
    if (session.userId) {
     const user = await this.usersService.findOne(session.userId)
     res.redirect(user.role===UserRole.Admin ?'/admin/dashboard':'/user/dashboard');
     return;
    }
    try {
      // Validate inputs
      if (!body.email || !body.password || !body.name) {
        req.flash('errors', 'All fields are required');  // Changed to string
        req.flash('old', body);
        return res.redirect('/signup');
      }

      // Create user and send verification email
      await this.authService.signup(req, body.email, body.password, body.name);

      // Show success message
      req.flash(
        'success',
        'Account created! Please check your email to verify your account.',
      );
      return res.redirect('/login');  // Changed from /signin
    } catch (error) {
      console.error('Signup error:', error);
      
      // Extract error message properly
      const errorMessage = error.message || 'Failed to create account';
      req.flash('errors', errorMessage);  // Changed to string
      req.flash('old', body);
      return res.redirect('/signup');
    }
  }

  // ─── EMAIL VERIFICATION ROUTES ───────────────────────────────────────────────

  @Get('verify/:token')
  async verifyEmail(
    @Param('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.authService.verifyEmail(token);

      req.flash('success', 'Email verified successfully! You can now log in.');
      return res.redirect('/login');  // Changed from /signin
    } catch (error) {
      console.error('Verification error:', error);
      req.flash('errors', error.message || 'Verification failed');
      return res.redirect('/login');  // Changed from /signin
    }
  }

  @Get('resend-verification')
  loadResendView(@Res() res: Response, @Req() req: Request) {
    return res.render('pages/auth/resend-verification', {
      title: 'Resend Verification',
      page_title: 'Resend Verification Email',
      folder: 'Authentication',
      layout: 'layouts/layout-without-nav',
      errors: req.flash('errors')[0] || null,
      success: req.flash('success')[0] || null,
    });
  }

  @Post('resend-verification')
  async resendVerification(
    @Body() body: { email: string },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!body.email) {
        req.flash('errors', 'Email is required');
        return res.redirect('/resend-verification');
      }

      await this.authService.resendVerificationEmail(body.email);

      req.flash('success', 'Verification email sent! Please check your inbox.');
      return res.redirect('/resend-verification');
    } catch (error) {
      req.flash('errors', error.message || 'Failed to send verification email');
      return res.redirect('/resend-verification');
    }
  }

  // ─── SIGNIN ROUTES ───────────────────────────────────────────────────────────

  @Get('login')
  async loadLoginView(@Session() session, @Res() res: Response, @Req() req: Request) {
    if (session.userId) {
     const user = await this.usersService.findOne(session.userId)
     res.redirect(user.role===UserRole.Admin ?'/admin/dashboard':'/user/dashboard');
     return;
    }
    return res.render('pages/auth/login', {
      title: 'Login',
      page_title: 'Log In',
      folder: 'Authentication',
      layout: 'layouts/layout-without-nav',
      errors: req.flash('errors')[0] || null,
      success: req.flash('success')[0] || null,
      showResend: req.flash('showResend')[0] === 'true',  // Convert string to boolean
      old: req.flash('old')[0] || null,
    });
  }

  @Post('login')
  async login(
    @Body() body: LoginWebDto,
    @Session() session: Record<string, any>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (session.userId) {
      return res.redirect('/');
    }

    try {
      const user = await this.authService.validateUser(
        body.email,
        body.password,
      );

      if (!user) {
        throw new ForbiddenException('Invalid email or password');
      }

      // Set session
      session.userId = user.id;
      session.userRole = user.role;

      req.flash('toast', {
        message: { type: 'success', message: 'Login Successful' },
      });

      // Redirect based on role
      if (user.role === UserRole.Admin) {
        return res.redirect('/admin/dashboard');
      } else {
        return res.redirect('/user/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      req.flash('old', body);
      
      // Handle specific error types
      if (error.message === 'Please verify your email before logging in') {
        req.flash('errors', error.message);
        req.flash('showResend', 'true');  // Use string instead of boolean
      } else if (error.status === 403 || error.message.includes('Invalid')) {
        req.flash('errors', 'Invalid email or password');
      } else {
        req.flash('errors', 'Login failed. Please try again.');
      }

      return res.render('pages/auth/login',{
        title: 'Login',
        page_title: 'Log In',
        folder: 'Authentication',
        layout: 'layouts/layout-without-nav',
        errors: error.message || null,
        success: req.flash('success')[0] || null,
        showResend: req.flash('showResend')[0] === 'true',  // Convert string to boolean
        old: req.flash('old')[0] || null,
    });
    }
  }

  // ─── LOGOUT ──────────────────────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@Session() session: any, @Res() res: Response, @Req() req: Request) {
    session.userId = null;
    session.userRole = null;
    req.flash('success', 'Logout successful');
    return res.redirect('/login');  // Changed from /signin
  }
}