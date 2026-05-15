import {
  BadRequestException,
  Body,
  Get,
  Post,
  Controller,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/role.enum';
import { AuthGuard } from './guards/auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './roles.decorator';
import { AuthenticatedRequest } from './type/authenticated-request.type';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) { }

  @Post('signup')
  @ApiCreatedResponse()
  @ApiBadRequestResponse()
  async signUp(@Body() createUserDto: CreateUserDto): Promise<void> {
    return await this.userService.signUp({
      ...createUserDto,
      role: UserRole.User,
    });
  }

  @Post('signupEmployee')
  @ApiCreatedResponse()
  @ApiBadRequestResponse()
  async signUpEmployee(@Body() createUserDto: CreateUserDto): Promise<void> {
    return await this.userService.signUp({
      ...createUserDto,
      role: UserRole.Employee,
    });
  }

  @Post('loginUser')
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse()
  async loginUser(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.loginWithRole(loginDto, res, UserRole.User);
  }

  @Post('loginEmployee')
  @ApiCreatedResponse()
  @ApiUnauthorizedResponse()
  async loginEmployee(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.loginWithRole(loginDto, res, UserRole.Employee);
  }

  @Post('logout')
  @ApiCreatedResponse()
  logout(
    @Body('role') role: UserRole,
    @Res({ passthrough: true }) res: Response,
  ): void {
    let cookieName: string;

    if (role === UserRole.User) {
      cookieName = 'user_access_token';
    } else if (role === UserRole.Employee) {
      cookieName = 'employee_access_token';
    } else {
      throw new BadRequestException('Invalid role');
    }

    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
    });
    return;
  }

  @Get('meUser')
  @Roles(UserRole.User)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiCookieAuth('user_access_token')
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        sub: { type: 'number' },
        email: { type: 'string' },
        role: { type: 'string' },
        iat: { type: 'number' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  meUser(@Req() req: AuthenticatedRequest): AuthenticatedRequest['user'] {
    return req.user;
  }

  @Get('meEmployee')
  @Roles(UserRole.Employee)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiCookieAuth('employee_access_token')
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        sub: { type: 'number' },
        email: { type: 'string' },
        role: { type: 'string' },
        iat: { type: 'number' },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No token provided | Invalid or expired token',
  })
  meEmployee(@Req() req: AuthenticatedRequest): AuthenticatedRequest['user'] {
    return req.user;
  }

  private async loginWithRole(
    loginDto: LoginDto,
    res: Response,
    role: UserRole,
  ): Promise<void> {
    const token = await this.authService.login(loginDto, role);
    const cookieName =
      role === UserRole.User ? 'user_access_token' : 'employee_access_token';

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      path: '/',
      maxAge: 3 * 24 * 60 * 60 * 1000,
    });

    return;
  }
}
