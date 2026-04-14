import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { plainToInstance } from 'class-transformer';
import { Request, Response } from 'express';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

import { AuthGuard } from '../../../../common/guards/auth.guard';
import { UpdateUserDto } from '../../../users/dtos/request/update-user.dto';
import { UserDto } from '../../../users/dtos/response/user.dto';
import { UsersService } from '../../../users/users.service';
import { MailService } from '../../../mail/mail.service';
import { userProfileImageConfig } from '../../../users/config/multer.config';

@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private usersService: UsersService,
    private mailService: MailService,
  ) {}

  // ─── LIST ────────────────────────────────────────────────────────────────────

  @Get()
  async getUserList(
    @Req() request: Request,
    @Paginate() query: PaginateQuery,
    @Res() res: Response,
  ) {
    const isAjax =
      request.xhr ||
      request.headers['accept']?.includes('application/json') ||
      request.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isAjax) {
      const result = await this.usersService.getUsersPaginate(query);
      return res.json(result);
    }

    return res.render('pages/admin/users/index', {
      layout: 'layouts/admin-layout',
      title: 'User List',
      page_title: 'User DataTable',
      folder: 'User',
      success: request.flash('success')[0] || null,
      emailWarning: request.flash('emailWarning')[0] || null,
    });
  }

  // ─── CREATE VIEW ─────────────────────────────────────────────────────────────

  @Get('/create')
  createUserView(@Req() req: Request, @Res() res: Response) {
    return res.render('pages/admin/users/create', {
      layout: 'layouts/admin-layout',
      title: 'Create User',
      page_title: 'Create User',
      folder: 'User',
      errors: req.flash('errors')[0] || {},
      old: req.flash('old')[0] || null,
    });
  }

  // ─── SHOW ────────────────────────────────────────────────────────────────────

  @Get('/:id')
  async getUserById(@Param('id') id: string, @Res() res: Response) {
    const user = await this.usersService.findOne(id);
    if (!user) return res.redirect('/admin/users');

    return res.render('pages/admin/users/show', {
      layout: 'layouts/admin-layout',
      title: 'User Detail',
      page_title: 'User Detail',
      folder: 'User',
      user: plainToInstance(UserDto, user),
    });
  }

  // ─── EDIT VIEW ───────────────────────────────────────────────────────────────

  @Get('/:id/edit')
  async editUserById(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException('User not found!');

    return res.render('pages/admin/users/edit', {
      layout: 'layouts/admin-layout',
      title: 'Edit User',
      page_title: 'Edit User',
      folder: 'User',
      user: plainToInstance(UserDto, user),
      errors: req.flash('errors')[0] || {},
      old: req.flash('old')[0] || null,
      success: req.flash('success')[0] || null,
      error: req.flash('error')[0] || null,
    });
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  @Post()
  @UseInterceptors(FileInterceptor('profile_image', userProfileImageConfig))
  async createUser(
    @Body()
    body: {
      name: string | undefined;
      email: string | undefined;
      phoneNumber: string | undefined;
      password: string | undefined;
    },
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // ── 1. Validate required fields ──────────────────────────────────────────
    const errors: Record<string, string[]> = {};

    if (!body.name || body.name.trim() === '')
      errors.name = ['Name is required'];
    if (!body.email || body.email.trim() === '')
      errors.email = ['Email is required'];
    if (!body.phoneNumber || body.phoneNumber.trim() === '')
      errors.phoneNumber = ['Phone number is required'];
    if (!body.password || body.password.trim() === '')
      errors.password = ['Password is required'];

    // ── 2. Validate email format (before hitting DB or sending mail) ─────────
    if (body.email && body.email.trim() !== '') {
      const emailCheck = this.mailService.validateEmail(body.email);
      if (!emailCheck.valid) {
        errors.email = [emailCheck.message!];
      }
    }

    if (Object.keys(errors).length > 0) {
      req.flash('errors', errors);
      req.flash('old', body);
      return res.redirect('/admin/users/create');
    }

    // ── 3. Persist the new user ──────────────────────────────────────────────
    const data = {
      name: body.name!.trim(),
      email: body.email!.trim(),
      phoneNumber: body.phoneNumber!.trim(),
      password: body.password!,
      profile_image: file?.filename,
    };

    await this.usersService.create(data);

    // ── 4. Send welcome email (non-blocking — warn admin, don't fail) ────────
    const mailResult = await this.mailService.sendWelcomeEmail({
      name: data.name,
      email: data.email,
      password: data.password,
    });

    if (!mailResult.success) {
      req.flash(
        'emailWarning',
        `User was created, but the welcome email could not be delivered: ${mailResult.error}`,
      );
    } else {
      req.flash(
        'success',
        `User created and welcome email sent to ${data.email}.`,
      );
    }

    return res.redirect('/admin/users');
  }

  // ─── UPDATE (web form) ────────────────────────────────────────────────────────

  @Put('/:id/update')
  async updateUserById(
    @Param('id') id: string,
    @Body()
    body: {
      name: string | undefined;
      email: string | undefined;
      phoneNumber: string | undefined;
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const errors: Record<string, string[]> = {};

      if (!body.name || body.name === '')
        errors.name = ['Name should not be empty'];
      if (!body.email || body.email === '')
        errors.email = ['Email should not be empty'];
      if (!body.phoneNumber || body.phoneNumber === '')
        errors.phoneNumber = ['Phone Number should not be empty'];

      if (Object.keys(errors).length > 0) {
        req.flash('errors', errors);
        req.flash('old', body);
        return res.redirect(`/admin/users/${id}/edit`);
      }

      await this.usersService.update(id, {
        name: body.name,
        email: body.email,
        phoneNumber: body.phoneNumber,
      });

      req.flash('success', 'User updated successfully!');
      return res.redirect('/admin/users/' + id);
    } catch (error) {
      console.error(error);
      req.flash('errors', { general: ['Failed to update user'] });
      return res.redirect(`/admin/users/${id}/edit`);
    }
  }

  // ─── UPDATE (API PUT) ─────────────────────────────────────────────────────────

  @Put('/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, {
      email: updateUserDto.email,
      phoneNumber: updateUserDto.phoneNumber,
      name: updateUserDto.name,
    });
  }

  // ─── DELETE ───────────────────────────────────────────────────────────────────

  @Delete('/:id')
  async deleteUser(@Param('id') id: string, @Res() res: Response) {
    await this.usersService.remove(id);
    return res.redirect('/admin/users');
  }

  // ─── PROFILE IMAGE UPLOAD ─────────────────────────────────────────────────────

  @Post('/:id/profile-image')
  @UseInterceptors(FileInterceptor('profile_image', userProfileImageConfig))
  async uploadProfileImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      if (!file) {
        req.flash('error', 'No file uploaded');
        return res.redirect(`/admin/users/${id}/edit`);
      }
      await this.usersService.updateProfileImage(id, file);
      req.flash('success', 'Profile image updated successfully');
      return res.redirect(`/admin/users/${id}/edit`);
    } catch (error) {
      console.error('Profile image upload error:', error);
      req.flash(
        'error',
        error instanceof BadRequestException
          ? error.message
          : 'Failed to upload profile image',
      );
      return res.redirect(`/admin/users/${id}/edit`);
    }
  }

  // ─── PROFILE IMAGE DELETE ─────────────────────────────────────────────────────

  @Delete('/:id/profile-image')
  async deleteProfileImage(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.usersService.deleteProfileImage(id);
      req.flash('success', 'Profile image deleted successfully');
    } catch (error) {
      req.flash('error', 'Failed to delete profile image');
    }
    return res.redirect(`/admin/users/${id}/edit`);
  }
}
