import {
  Controller,
  Get,
  Param,
  Delete,
  HttpException,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UserService } from './user.service';
import { BaseUserDto } from './dto/base-user.dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from './role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedRequest } from '../auth/type/authenticated-request.type';

@UseGuards(AuthGuard, RolesGuard)
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Roles(UserRole.Employee, UserRole.User)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest): Promise<BaseUserDto> {
    try {
      return await this.userService.findOne(req.user.sub);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'No user found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  @Roles(UserRole.Employee)
  @Get('findAll')
  async findAll(): Promise<BaseUserDto[]> {
    try {
      return await this.userService.findAll();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: 'No users found',
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  @Roles(UserRole.Employee)
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<BaseUserDto> {
    try {
      return await this.userService.findOne(+id);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `User with id ${id} not found`,
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }

  @Roles(UserRole.Employee)
  @Delete(':id')
  async remove(@Param('id') id: string): Promise<string> {
    try {
      await this.userService.remove(+id);
      return `User with id ${id} removed successfully`;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `Failed to remove user with id ${id}`,
        },
        HttpStatus.NOT_FOUND,
        {
          cause: error,
        },
      );
    }
  }
}
