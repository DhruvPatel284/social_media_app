import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

import { Request, Response } from 'express';
import { Paginate, PaginateQuery } from 'nestjs-paginate';

import { AuthGuard } from '../../../../common/guards/auth.guard';
import { PostsService } from '../../../posts/posts.service';
import {
  multerPostMediaConfig,
  validateFileSize,
} from '../../../posts/config/multer-post-media.config';

@Controller('admin/posts')
export class AdminPostsController {
  constructor(private postsService: PostsService) {}

  // ─── LIST ────────────────────────────────────────────────────────────────────

  @Get()
  async getPostList(
    @Req() request: Request,
    @Paginate() query: PaginateQuery,
    @Res() res: Response,
  ) {
    const isAjax =
      request.xhr ||
      request.headers['accept']?.includes('application/json') ||
      request.headers['x-requested-with'] === 'XMLHttpRequest';

    if (isAjax) {
      const result = await this.postsService.getPostsPaginate(query);

      // Attach virtual counts to each item
      const enriched = {
        ...result,
        data: result.data.map((post) => ({
          ...post,
          commentCount: post.comments?.length ?? 0,
          likeCount: post.likedBy?.length ?? 0,
          imageCount: post.media?.filter(m => m.type === 'image').length ?? 0,
          videoCount: post.media?.filter(m => m.type === 'video').length ?? 0,
        })),
      };

      return res.json(enriched);
    }

    return res.render('pages/admin/posts/index', {
      layout: 'layouts/admin-layout',
      title: 'Post List',
      page_title: 'Post DataTable',
      folder: 'Post',
    });
  }

  // ─── SHOW ────────────────────────────────────────────────────────────────────

  @Get('/:id')
  async getPostById(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const post = await this.postsService.findOne(id);

    if (!post) return res.redirect('/posts');

    const successMessage = req.flash('success')[0] || null;

    return res.render('pages/admin/posts/show', {
      layout: 'layouts/admin-layout',
      title: 'Post Detail',
      page_title: 'Post Detail',
      folder: 'Post',
      post,
      successMessage,
    });
  }

  // ─── TOGGLE REVIEWED ─────────────────────────────────────────────────────────

  @Post('/:id/toggle-reviewed')
  async toggleReviewed(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const post = await this.postsService.findOne(id);

    if (!post) throw new NotFoundException('Post not found');

    await this.postsService.toggleReviewed(id);

    const newStatus = !post.Reviewed;
    req.flash(
      'success',
      `Post has been marked as ${newStatus ? 'Reviewed ✓' : 'Unreviewed ✗'}`,
    );

    return res.redirect(`/admin/posts/${id}`);
  }

  // ─── CREATE VIEW ─────────────────────────────────────────────────────────────

  @Get('/create')
  createPostView(@Req() req: Request, @Res() res: Response) {
    return res.render('pages/admin/posts/create', {
      layout: 'layouts/admin-layout',
      title: 'Create Post',
      page_title: 'Create Post',
      folder: 'Post',
      errors: req.flash('errors')[0] || {},
      old: req.flash('old')[0] || null,
    });
  }

  // ─── CREATE POST ─────────────────────────────────────────────────────────────

  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
      ],
      multerPostMediaConfig,
    ),
  )
  async createPost(
    @Body() body: { content: string; userId?: string },
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Validate file sizes
      if (files?.images) {
        files.images.forEach((file) => {
          try {
            validateFileSize(file);
          } catch (error) {
            throw new Error(`Image "${file.originalname}": ${error.message}`);
          }
        });
      }
      if (files?.videos) {
        files.videos.forEach((file) => {
          try {
            validateFileSize(file);
          } catch (error) {
            throw new Error(`Video "${file.originalname}": ${error.message}`);
          }
        });
      }

      // Validate content
      if (!body.content || body.content.trim() === '') {
        req.flash('errors', { content: ['Content is required'] });
        req.flash('old', body);
        return res.redirect('/posts/create');
      }

      // Extract filenames only (not full paths)
      const imageFilenames = files?.images?.map((f) => f.filename) || [];
      const videoFilenames = files?.videos?.map((f) => f.filename) || [];

      // Get current user from session (assuming req.session.user exists from AuthGuard)
      const userId = (req as any).session?.user?.id || body.userId;

      if (!userId) {
        req.flash('errors', { general: ['User not authenticated'] });
        return res.redirect('/posts/create');
      }

      await this.postsService.create(
        userId,
        body.content,
        imageFilenames,
        videoFilenames,
      );

      req.flash('success', 'Post created successfully!');
      return res.redirect('/admin/posts');
    } catch (error) {
      console.error('Create post error:', error);
      
      // Check if it's a file validation error
      if (error.message && (error.message.includes('Image') || error.message.includes('Video'))) {
        req.flash('errors', { media: [error.message] });
      } else {
        req.flash('errors', { general: [error.message || 'Failed to create post'] });
      }
      
      req.flash('old', body);
      return res.redirect('/posts/create');
    }
  }

  // ─── EDIT VIEW ───────────────────────────────────────────────────────────────

  @Get('/:id/edit')
  async editPostView(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const post = await this.postsService.findOne(id);

    if (!post) throw new NotFoundException('Post not found');

    return res.render('pages/admin/posts/edit', {
      layout: 'layouts/admin-layout',
      title: 'Edit Post',
      page_title: 'Edit Post',
      folder: 'Post',
      post,
      errors: req.flash('errors')[0] || {},
      old: req.flash('old')[0] || null,
    });
  }

  // ─── UPDATE POST ─────────────────────────────────────────────────────────────

  @Put('/:id')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 10 },
        { name: 'videos', maxCount: 5 },
      ],
      multerPostMediaConfig,
    ),
  )
  async updatePost(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { content: string; keepImages?: string; keepVideos?: string },
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    },
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const post = await this.postsService.findOne(id);

      // Validate file sizes
      if (files?.images) {
        files.images.forEach(validateFileSize);
      }
      if (files?.videos) {
        files.videos.forEach(validateFileSize);
      }

      // Handle existing media - keepImages/keepVideos are comma-separated filenames
      const existingImages = body.keepImages
        ? body.keepImages.split(',').filter(Boolean)
        : [];
      const existingVideos = body.keepVideos
        ? body.keepVideos.split(',').filter(Boolean)
        : [];

      // Add new uploads
      const newImages = files?.images?.map((f) => f.filename) || [];
      const newVideos = files?.videos?.map((f) => f.filename) || [];

      const allImages = [...existingImages, ...newImages];
      const allVideos = [...existingVideos, ...newVideos];

      await this.postsService.update(id, body.content, allImages, allVideos);

      req.flash('success', 'Post updated successfully!');
      return res.redirect(`/admin/posts/${id}`);
    } catch (error) {
      console.error('Update post error:', error);
      req.flash('errors', { general: [error.message || 'Failed to update post'] });
      req.flash('old', body);
      return res.redirect(`/admin/posts/${id}/edit`);
    }
  }

  // ─── DELETE POST ─────────────────────────────────────────────────────────────

  @Delete('/:id')
  async deletePost(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      await this.postsService.remove(id);
      req.flash('success', 'Post deleted successfully!');
      return res.redirect('/admin/posts');
    } catch (error) {
      console.error('Delete post error:', error);
      req.flash('errors', { general: [error.message || 'Failed to delete post'] });
      return res.redirect('/admin/posts');
    }
  }
}