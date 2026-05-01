import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../user/role.enum';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;
  let jwtService: JwtService;

  const mockUser = {
    id: 1,
    email: 'user@test.com',
    name: 'Maria',
    surname: 'Marie',
    password: 'hashed_password',
    birthday: new Date('1998-01-01'),
    role: UserRole.User,
  };

  const mockToken = 'jwt.token';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue(mockToken),
          },
        },
        {
          provide: UserService,
          useValue: {
            findOneByEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return a token when password matches', async () => {
      jest.spyOn(userService, 'findOneByEmail').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'user@test.com',
        password: 'password123',
      });

      expect(result).toEqual(mockToken);
      expect(userService.findOneByEmail).toHaveBeenCalledWith('user@test.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashed_password',
      );
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
    });

    it('should throw an error when password does not match', async () => {
      jest.spyOn(userService, 'findOneByEmail').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'user@test.com',
          password: 'wrong_password',
        }),
      ).rejects.toThrow();

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should throw an error when user not found', async () => {
      jest
        .spyOn(userService, 'findOneByEmail')
        .mockRejectedValue(new Error(''));

      await expect(
        service.login({
          email: 'nonexistent@test.com',
          password: 'password123',
        }),
      ).rejects.toThrow();

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });
});
