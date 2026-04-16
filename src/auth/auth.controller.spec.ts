import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { HttpException } from '@nestjs/common';
import { UserRole } from '../user/role.enum';

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
  };
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
      mockUserService.signUp.mockResolvedValue('User created successfully');

      const result = await controller.signUp(createUserDtoWithRoleUser);

      expect(mockUserService.signUp).toHaveBeenCalledWith(
        createUserDtoWithRoleUser,
      );
      expect(result).toBe('User created successfully');
    });

    it('should handle sign up errors', async () => {
      mockUserService.signUp.mockRejectedValue(new Error(''));

      await expect(
        controller.signUp(createUserDtoWithRoleUser),
      ).rejects.toThrow(HttpException);
    });

    it('should sign up employee successfully with Employee role', async () => {
      mockUserService.signUp.mockResolvedValue('User created successfully');

      const result = await controller.signUpEmployee(
        createUserDtoWithRoleEmployee,
      );

      expect(mockUserService.signUp).toHaveBeenCalledWith(
        createUserDtoWithRoleEmployee,
      );
      expect(result).toBe('User created successfully');
    });

    it('should handle employee sign up errors', async () => {
      mockUserService.signUp.mockRejectedValue(new Error(''));

      await expect(
        controller.signUpEmployee(createUserDtoWithRoleEmployee),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      mockAuthService.login.mockResolvedValue(true);

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toBe(true);
    });

    it('should handle login errors', async () => {
      mockAuthService.login.mockRejectedValue(new Error());

      await expect(controller.login(loginDto)).rejects.toThrow(HttpException);
      await expect(controller.login(loginDto)).rejects.toHaveProperty(
        'status',
        401,
      );
    });
  });
});
