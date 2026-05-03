import {
  Body,
  Post,
  Controller,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/role.enum';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) { }

  @Post('signup')
  async signUp(@Body() createUserDto: CreateUserDto): Promise<void> {
    try {
      return await this.userService.signUp({
        ...createUserDto,
        role: UserRole.User,
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to create user',
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Post('signupEmployee')
  async signUpEmployee(@Body() createUserDto: CreateUserDto): Promise<void> {
    try {
      return await this.userService.signUp({
        ...createUserDto,
        role: UserRole.Employee,
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: 'Failed to create user',
        },
        HttpStatus.BAD_REQUEST,
        {
          cause: error,
        },
      );
    }
  }

  @Post('loginUser')
  async loginUser(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.loginWithRole(loginDto, res, UserRole.User);
  }

  @Post('loginEmployee')
  async loginEmployee(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.loginWithRole(loginDto, res, UserRole.Employee);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie('access_token');
    return;
  }

  private async loginWithRole(
    loginDto: LoginDto,
    res: Response,
    role: UserRole,
  ): Promise<void> {
    try {
      const token = await this.authService.login(loginDto, role);

      res.cookie('access_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });

      return;
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.UNAUTHORIZED,
          error: 'Invalid credentials',
        },
        HttpStatus.UNAUTHORIZED,
        {
          cause: error,
        },
      );
    }
  }
}
