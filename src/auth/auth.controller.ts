import {
  Body,
  Post,
  Controller,
  HttpException,
  HttpStatus,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';
import { UserRole } from '../user/role.enum';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) { }

  @Post('signup')
  async signUp(@Body() createUserDto: CreateUserDto): Promise<void> {
    try {
      this.logger.log('Received user sign up request');
      return await this.userService.signUp({
        ...createUserDto,
        role: UserRole.User,
      });
    } catch (error) {
      this.logger.log('Error on user sign up request');
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
    this.logger.log('Received employee sign up request');
    try {
      return await this.userService.signUp({
        ...createUserDto,
        role: UserRole.Employee,
      });
    } catch (error) {
      this.logger.log('Error on employee sign up request');
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

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.loginWithRole(loginDto, res, UserRole.User);
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
    this.logger.log('Received user logout request');
    res.clearCookie('access_token');
    return;
  }

  private async loginWithRole(
    loginDto: LoginDto,
    res: Response,
    role: UserRole,
  ): Promise<void> {
    try {
      this.logger.log(`Received login request`);
      const token = await this.authService.login(loginDto, role);

      res.cookie('access_token', token, {
        httpOnly: true,
      });

      return;
    } catch (error) {
      this.logger.log(`Error on login request`);
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
