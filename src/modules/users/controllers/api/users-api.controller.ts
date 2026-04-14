import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Paginate, PaginateQuery } from 'nestjs-paginate';
import { JwtAuthGuard } from 'src/common/guards/passport-jwt.guard';

import { Serialize } from '../../../../common/interceptors/serialize.interceptor';
import { CreateUserDto } from '../../dtos/request/create-user.dto';
import { UpdateUserDto } from '../../dtos/request/update-user.dto';
import { UserDto } from '../../dtos/response/user.dto';
import { UsersService } from '../../users.service';

@Controller('/api/users')
@UseGuards(JwtAuthGuard)
export class UsersApiController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Serialize(UserDto, {
    isPaginated: true,
  })
  async getUserList(@Paginate() query: PaginateQuery) {
    const result = await this.usersService.getUsersPaginate(query);
    return result;
  }

  @Get('/:id')
  @Serialize(UserDto)
  async getUserById(@Param('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException('User not found!');
    return user;
  }

  @Post()
  @Serialize(UserDto)
  async createUser(@Body() body: CreateUserDto) {
    return await this.usersService.create(body);
  }

  @Put('/:id')
  @Serialize(UserDto)
  updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.usersService.update(id, body);
  }

  @Delete('/:id')
  @Serialize(UserDto)
  async deleteUser(@Param('id') id: string) {
    return await this.usersService.remove(id);
  }
}
