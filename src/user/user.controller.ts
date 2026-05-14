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
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@UseGuards(AuthGuard, RolesGuard)
@ApiCookieAuth()
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Roles(UserRole.Employee, UserRole.User)
  @Get('profile')
  @ApiOkResponse({ type: BaseUserDto })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async getProfile(@Req() req: AuthenticatedRequest): Promise<BaseUserDto> {
    return await this.userService.findOne(req.user.sub);
  }

  @Roles(UserRole.Employee)
  @Get('findAll')
  @ApiOkResponse({ type: [BaseUserDto] })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  async findAll(): Promise<BaseUserDto[]> {
    return await this.userService.findAll();
  }

  @Roles(UserRole.Employee)
  @Get(':id')
  @ApiOkResponse({ type: BaseUserDto })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<BaseUserDto> {
    return await this.userService.findOne(id);
  }

  @Roles(UserRole.Employee)
  @Delete(':id')
  @ApiOkResponse()
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  @ApiForbiddenResponse()
  @ApiNotFoundResponse()
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.userService.remove(id);
  }
}
