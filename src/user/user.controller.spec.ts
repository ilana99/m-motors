import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { HttpException } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('UserController', () => {
  let controller: UserController;
  let mockUserService: any;

  beforeEach(async () => {
    mockUserService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<UserController>(UserController);
  });

  it('should return all users', async () => {
    const mockUsers = [
      { id: 1, name: 'User 1' },
      { id: 2, name: 'User 2' },
    ];
    mockUserService.findAll.mockResolvedValue(mockUsers);

    const result = await controller.findAll();

    expect(mockUserService.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockUsers);
  });

  it('should not return all users and throw error', async () => {
    mockUserService.findAll.mockRejectedValue(new Error(''));

    const result = controller.findAll();

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should find one user by id', async () => {
    const mockUser = { id: 1, name: 'User 1' };
    mockUserService.findOne.mockResolvedValue(mockUser);

    const result = await controller.findOne('1');

    expect(mockUserService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockUser);
  });

  it('should not find one user by id and throw error', async () => {
    mockUserService.findOne.mockRejectedValue(new Error(''));

    const result = controller.findOne('1');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should remove one user by id', async () => {
    const result = await controller.remove('1');

    expect(mockUserService.remove).toHaveBeenCalledWith(1);
    expect(result).toEqual('User with id 1 removed successfully');
  });

  it('should not remove one user by id and throw error', async () => {
    mockUserService.remove.mockRejectedValue(new Error(''));

    const result = controller.remove('1');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });
});
