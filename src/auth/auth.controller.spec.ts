import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { HttpException } from '@nestjs/common';
import { UserRole } from '../user/role.enum';
import { Response } from 'express';
import { CreateUserDto } from '../user/dto/create-user.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: any;
  let mockUserService: any;
  const createUserDto = {
    email: 'email@test.com',
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
    email: 'email@test.com',
    password: 'password',
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
      mockUserService.signUp.mockRejectedValue(new Error(''));

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
      mockUserService.signUp.mockRejectedValue(new Error(''));

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

      await controller.login(loginDto, mockRes);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(mockRes.cookie).toHaveBeenCalledWith('access_token', mockToken, {
        httpOnly: true,
      });
    });

    it('should return error when login fails', async () => {
      const mockRes = {
        cookie: jest.fn().mockReturnThis(),
      } as unknown as Response<Response>;

      mockAuthService.login.mockRejectedValue(new Error());

      const result = controller.login(loginDto, mockRes);

      await expect(result).rejects.toThrow(HttpException);
      expect(mockRes.cookie).not.toHaveBeenCalled();
    });

    it('should logout user', async () => {
      const mockRes = {
        clearCookie: jest.fn().mockReturnThis(),
      } as unknown as Response<Response>;

      const result = controller.logout(mockRes);

      expect(mockRes.clearCookie).toHaveBeenCalledWith('access_token');
      expect(result).toBeUndefined();
    });
  });
});
