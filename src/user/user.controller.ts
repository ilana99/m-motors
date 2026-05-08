import {
  Controller,
  Get,
  Param,
  Delete,
  ParseIntPipe,
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
    return await this.userService.findOne(req.user.sub);
  }

  @Roles(UserRole.Employee)
  @Get('findAll')
  async findAll(): Promise<BaseUserDto[]> {
    return await this.userService.findAll();
  }

  @Roles(UserRole.Employee)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BaseUserDto> {
    return await this.userService.findOne(id);
  }

  @Roles(UserRole.Employee)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.userService.remove(id);
  }
}
