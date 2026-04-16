import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../user/role.enum';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));


describe('AuthService', () => {
  let service: AuthService;
  let userService: UserService;

  const mockUser = {
    id: 1,
    email: 'user@test.com',
    name: 'Maria',
    surname: 'Marie',
    password: 'hashed_password',
    birthday: new Date('1998-01-01'),
    role: UserRole.User,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return true when password matches', async () => {
      jest.spyOn(userService, 'findOneByEmail').mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'user@test.com',
        password: 'password123',
      });

      expect(result).toBe(true);
      expect(userService.findOneByEmail).toHaveBeenCalledWith('user@test.com');
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password123',
        'hashed_password',
      );
    });

    it('should return false when password does not match', async () => {
      jest.spyOn(userService, 'findOneByEmail').mockResolvedValue(mockUser);
     (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.login({
        email: 'user@test.com',
        password: 'wrong_password',
      });

      expect(result).toBe(false);
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
    });
  });
});
