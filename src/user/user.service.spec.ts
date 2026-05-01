import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { UserEntity } from './entities/user.entity';
import { BaseUserDto } from './dto/base-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from './role.enum';

jest.mock('bcrypt');

describe('UserService', () => {
  let service: UserService;
  let mockUserRepository: any;

  beforeEach(async () => {
    mockUserRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOneOrFail: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signUp', () => {
    it('should create a user successfully', async () => {
      const createUserDto = {
        email: 'email@test.com',
        password: 'password',
        name: 'Maria',
        surname: 'Marie',
        birthday: new Date('1998-01-01'),
        role: UserRole.User,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockUserRepository.save.mockResolvedValue();

      await service.signUp(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith(createUserDto.password, 10);
      expect(mockUserRepository.save).toHaveBeenCalledWith({
        ...createUserDto,
        password: 'hashedPassword',
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of users', async () => {
      const mockUsers = [
        {
          id: 1,
          email: 'user1@test.com',
          name: 'Maria',
          surname: 'Marie',
          birthday: new Date('1998-01-01'),
        },
        {
          id: 2,
          email: 'user2@test.com',
          name: 'Mario',
          surname: 'Marie',
          birthday: new Date('1999-01-01'),
        },
      ];

      mockUserRepository.find.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(mockUserRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(BaseUserDto);
      expect(result[0].email).toBe('user1@test.com');
      expect(result[1].email).toBe('user2@test.com');
    });

    it('should return an empty array when no users exist', async () => {
      mockUserRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        name: 'Maria',
        surname: 'Marie',
        birthday: new Date('1998-01-01'),
      };

      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeInstanceOf(BaseUserDto);
      expect(result.email).toBe('user@test.com');
      expect(result.id).toBe('1');
    });

    it('should throw an error when user is not found', async () => {
      mockUserRepository.findOneOrFail.mockRejectedValue(new Error(''));

      await expect(service.findOne(999)).rejects.toThrow('');
    });
  });

  describe('findOneByEmail', () => {
    it('should return a user by email', async () => {
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        name: 'Maria',
        surname: 'Marie',
        password: 'hashedPassword',
        birthday: new Date('1998-01-01'),
      };

      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);

      const result = await service.findOneByEmail('user@test.com');

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { email: 'user@test.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw an error when user email is not found', async () => {
      mockUserRepository.findOneOrFail.mockRejectedValue(new Error(''));

      await expect(service.findOneByEmail('notfound@test.com')).rejects.toThrow(
        '',
      );
    });
  });

  describe('remove', () => {
    it('should remove a user by id', async () => {
      const mockUser = {
        id: 1,
        email: 'user@test.com',
        birthday: new Date('1998-01-01'),
      };

      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);
      mockUserRepository.remove.mockResolvedValue(mockUser);

      const result = await service.remove(1);

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockUserRepository.remove).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw an error when user to remove is not found', async () => {
      mockUserRepository.findOneOrFail.mockRejectedValue(new Error(''));

      await expect(service.remove(999)).rejects.toThrow('');
    });
  });
});
