import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '../user/role.enum';
import { Response } from 'express';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockUserService: any;
  const createUserDto = {
    email: 'user@gmail.com',
    name: 'Maria',
    surname: 'Marie',
    password: 'password',
    birthday: new Date('1998-01-01'),
  } as CreateUserDto;
  const mockToken = 'jwt.token';
  const createUserDtoWithRoleUser = {
    ...createUserDto,
    role: UserRole.User,
  };
  const createUserDtoWithRoleEmployee = {
    ...createUserDto,
    role: UserRole.Employee,
  };
  const loginDto = {
    email: 'user@gmail.com',
    password: 'password',
  };
  const authenticatedUser = {
    sub: 1,
    email: 'user@gmail.com',
    role: UserRole.User,
  };
  const authenticatedEmployee = {
    sub: 2,
    email: 'user@gmail.com',
    role: UserRole.Employee,
  };

  beforeEach(async () => {
    mockUserService = {
      signUp: jest.fn(),
    };

    mockAuthService = {
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should sign up user successfully with User role', async () => {
      mockUserService.signUp.mockResolvedValue(undefined);

      const result = await controller.signUp(createUserDto);

      expect(mockUserService.signUp).toHaveBeenCalledWith(
        createUserDtoWithRoleUser,
      );
      expect(result).toBeUndefined();
    });

    it('should return error when user sign up fails', async () => {
      mockUserService.signUp.mockRejectedValue(
        new BadRequestException('Failed to create user'),
      );

      const result = controller.signUp(createUserDto);

      await expect(result).rejects.toThrow(HttpException);
    });

    it('should sign up employee successfully with Employee role', async () => {
      mockUserService.signUp.mockResolvedValue(undefined);

      const result = await controller.signUpEmployee(createUserDto);

      expect(mockUserService.signUp).toHaveBeenCalledWith(
        createUserDtoWithRoleEmployee,
      );
      expect(result).toBeUndefined();
    });

    it('should return error when employee sign up fails', async () => {
      mockUserService.signUp.mockRejectedValue(
        new BadRequestException('Failed to create user'),
      );

      const result = controller.signUpEmployee(createUserDto);

      await expect(result).rejects.toThrow(HttpException);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      mockAuthService.login.mockResolvedValue(mockToken);

      const mockRes = {
        cookie: jest.fn().mockReturnThis(),
      } as unknown as Response<Response>;

      await controller.loginUser(loginDto, mockRes);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginDto,
        UserRole.User,
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'user_access_token',
        mockToken,
        {
          httpOnly: true,
          maxAge: 259200000,
          secure: true,
          sameSite: 'none',
          path: '/',
        },
      );
    });

    it('should return error when login fails', async () => {
      const mockRes = {
        cookie: jest.fn().mockReturnThis(),
      } as unknown as Response<Response>;

      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      const result = controller.loginUser(loginDto, mockRes);

      await expect(result).rejects.toThrow(HttpException);
      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should login employee successfully', async () => {
      mockAuthService.login.mockResolvedValue(mockToken);

      const mockRes = {
        cookie: jest.fn().mockReturnThis(),
      } as unknown as Response<Response>;

      await controller.loginEmployee(loginDto, mockRes);

      expect(mockAuthService.login).toHaveBeenCalledWith(
        loginDto,
        UserRole.Employee,
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'employee_access_token',
        mockToken,
        {
          httpOnly: true,
          maxAge: 259200000,
          secure: true,
          sameSite: 'none',
          path: '/',
        },
      );
    });

    it('should logout user', async () => {
      const mockRes = {
        clearCookie: jest.fn().mockReturnThis(),
      } as unknown as Response<Response>;

      const result = controller.logout(UserRole.User, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('user_access_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should logout employee', async () => {
      const mockRes = {
        clearCookie: jest.fn().mockReturnThis(),
      } as unknown as Response<Response>;

      const result = controller.logout(UserRole.Employee, mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('employee_access_token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
      });
      expect(mockRes.clearCookie).toHaveBeenCalledTimes(1);
      expect(result).toBeUndefined();
    });

    it('should return error when logout role is invalid', async () => {
      const mockRes = {
        clearCookie: jest.fn().mockReturnThis(),
      } as unknown as Response<Response>;

      expect(() =>
        controller.logout(undefined as unknown as UserRole, mockRes),
      ).toThrow(HttpException);
      expect(mockRes.clearCookie).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('should return authenticated user', () => {
      const result = controller.meUser({ user: authenticatedUser } as any);

      expect(result).toBe(authenticatedUser);
    });

    it('should return authenticated employee', () => {
      const result = controller.meEmployee({
        user: authenticatedEmployee,
      } as any);

      expect(result).toBe(authenticatedEmployee);
    });
  });
});
