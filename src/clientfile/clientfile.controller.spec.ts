import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, NotFoundException } from '@nestjs/common';
import { ClientfileController } from './clientfile.controller';
import { ClientfileService } from './clientfile.service';
import { SupabaseStorageService } from '../utilities/supabase-storage/supabase-storage.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Status } from './status.enum';
import { UserRole } from '../user/role.enum';
import { Service } from '../cars/service.enum';
import { AuthenticatedRequest } from '../auth/type/authenticated-request.type';

type MockClientfileService = {
  create: jest.Mock;
  findAll: jest.Mock;
  findAllByStatus: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  updateStatus: jest.Mock;
  checkCreate: jest.Mock;
  checkUpdate: jest.Mock;
  findPendingSubmission: jest.Mock;
  cancelSubmission: jest.Mock;
  remove: jest.Mock;
};

type MockSupabaseStorageService = {
  uploadFile: jest.Mock;
};

describe('ClientfileController', () => {
  let controller: ClientfileController;
  let mockClientfileService: MockClientfileService;
  let mockSupabaseStorageService: MockSupabaseStorageService;

  const identityCard =
    'https://example.supabase.co/storage/v1/object/public/images/clientfiles/identity-card.jpg';
  const proofOfAddress =
    'https://example.supabase.co/storage/v1/object/public/images/clientfiles/proof-of-address.jpg';
  const genesisGv80Image =
    'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80.jpg';
  const request = {
    user: {
      sub: 2,
      email: 'client@example.com',
      role: UserRole.User,
    },
  } as AuthenticatedRequest;
  const employeeRequest = {
    user: {
      sub: 1,
      email: 'employee@example.com',
      role: UserRole.Employee,
    },
  } as AuthenticatedRequest;

  beforeEach(async () => {
    mockClientfileService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllByStatus: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      checkCreate: jest.fn(),
      checkUpdate: jest.fn(),
      findPendingSubmission: jest.fn(),
      cancelSubmission: jest.fn(),
      remove: jest.fn(),
    };
    mockSupabaseStorageService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientfileController],
      providers: [
        {
          provide: ClientfileService,
          useValue: mockClientfileService,
        },
        {
          provide: SupabaseStorageService,
          useValue: mockSupabaseStorageService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ClientfileController>(ClientfileController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a clientfile', async () => {
    const createClientfileDto = {
      carId: '1',
      insurance: 'true',
      roadsideAssistance: 'false',
      maintenance: 'true',
      technicalControl: 'false',
    };
    const files = {
      identityCard: [
        {
          originalname: 'identity-card.jpg',
          buffer: Buffer.from('identity'),
          mimetype: 'image/jpeg',
        },
      ],
      proofOfAddress: [
        {
          originalname: 'proof-of-address.jpg',
          buffer: Buffer.from('address'),
          mimetype: 'image/jpeg',
        },
      ],
    } as unknown as {
      identityCard: Array<Express.Multer.File>;
      proofOfAddress: Array<Express.Multer.File>;
    };
    const mockClientfile = {
      id: 3,
      ...createClientfileDto,
      userId: '2',
      identityCard,
      proofOfAddress,
    };

    mockClientfileService.checkCreate.mockResolvedValue(undefined);
    mockSupabaseStorageService.uploadFile
      .mockResolvedValueOnce(identityCard)
      .mockResolvedValueOnce(proofOfAddress);
    mockClientfileService.create.mockResolvedValue(mockClientfile);

    const result = await controller.create(createClientfileDto, files, request);

    expect(mockClientfileService.checkCreate).toHaveBeenCalledWith(2, 1);
    expect(mockClientfileService.create).toHaveBeenCalledWith({
      ...createClientfileDto,
      userId: '2',
      identityCard,
      proofOfAddress,
    });
    expect(result).toEqual(mockClientfile);
  });

  it('should not create a clientfile when user already has a pending file', async () => {
    mockClientfileService.checkCreate.mockRejectedValue(
      new HttpException('User already has a pending clientfile', 400),
    );

    const result = controller.create(
      {
        carId: '1',
        insurance: 'true',
        roadsideAssistance: 'false',
        maintenance: 'true',
        technicalControl: 'false',
      },
      {} as {
        identityCard?: Array<Express.Multer.File>;
        proofOfAddress?: Array<Express.Multer.File>;
      },
      request,
    );

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 400);
    expect(mockSupabaseStorageService.uploadFile).not.toHaveBeenCalled();
    expect(mockClientfileService.create).not.toHaveBeenCalled();
  });

  it('should not create a clientfile without required files', async () => {
    mockClientfileService.checkCreate.mockResolvedValue(undefined);

    const result = controller.create(
      {
        carId: '1',
        insurance: 'true',
        roadsideAssistance: 'false',
        maintenance: 'true',
        technicalControl: 'false',
      },
      {
        identityCard: [
          {
            originalname: 'identity-card.jpg',
            buffer: Buffer.from('identity'),
            mimetype: 'image/jpeg',
          },
        ],
      } as unknown as {
        identityCard?: Array<Express.Multer.File>;
        proofOfAddress?: Array<Express.Multer.File>;
      },
      request,
    );

    await expect(result).rejects.toHaveProperty('status', 400);
    expect(mockSupabaseStorageService.uploadFile).not.toHaveBeenCalled();
    expect(mockClientfileService.create).not.toHaveBeenCalled();
  });

  it('should return all clientfiles', async () => {
    const mockClientfiles = [
      {
        id: '3',
        status: Status.Pending,
        car: {
          id: '1',
          brand: 'Genesis',
          model: 'GV80',
          price: '75000.00',
          service: Service.Leasing,
          images: [genesisGv80Image],
          isAvailable: true,
        },
      },
    ];
    mockClientfileService.findAll.mockResolvedValue(mockClientfiles);

    const result = await controller.findAll(employeeRequest);

    expect(mockClientfileService.findAll).toHaveBeenCalledWith(
      UserRole.Employee,
      1,
    );
    expect(result).toEqual(mockClientfiles);
  });

  it('should return current user clientfiles', async () => {
    const mockClientfiles = [{ id: '3', status: Status.Pending }];
    mockClientfileService.findAll.mockResolvedValue(mockClientfiles);

    const result = await controller.findMine(request);

    expect(mockClientfileService.findAll).toHaveBeenCalledWith(
      UserRole.User,
      2,
    );
    expect(result).toEqual(mockClientfiles);
  });

  it('should return clientfiles by status', async () => {
    const mockClientfiles = [{ id: '3', status: Status.Pending }];
    mockClientfileService.findAllByStatus.mockResolvedValue(mockClientfiles);

    const result = await controller.findAllByStatus(Status.Pending);

    expect(mockClientfileService.findAllByStatus).toHaveBeenCalledWith(
      Status.Pending,
    );
    expect(result).toEqual(mockClientfiles);
  });

  it('should find one clientfile', async () => {
    const mockClientfile = {
      id: '3',
      status: Status.Pending,
    };
    mockClientfileService.findOne.mockResolvedValue(mockClientfile);

    const result = await controller.findOne(3, request);

    expect(mockClientfileService.findOne).toHaveBeenCalledWith(
      UserRole.User,
      2,
      3,
    );
    expect(result).toEqual(mockClientfile);
  });

  it('should update a clientfile', async () => {
    const files = {
      identityCard: [
        {
          originalname: 'identity-card.jpg',
          buffer: Buffer.from('identity'),
          mimetype: 'image/jpeg',
        },
      ],
    } as unknown as {
      identityCard: Array<Express.Multer.File>;
      proofOfAddress?: Array<Express.Multer.File>;
    };
    const updatedClientfile = {
      id: '3',
      identityCard,
    };

    mockClientfileService.checkUpdate.mockResolvedValue(undefined);
    mockSupabaseStorageService.uploadFile.mockResolvedValue(identityCard);
    mockClientfileService.update.mockResolvedValue(updatedClientfile);

    const result = await controller.update(
      3,
      { insurance: 'false' },
      files,
      request,
    );

    expect(mockClientfileService.checkUpdate).toHaveBeenCalledWith(
      UserRole.User,
      2,
      3,
    );
    expect(mockClientfileService.update).toHaveBeenCalledWith(
      UserRole.User,
      2,
      3,
      {
        insurance: 'false',
        identityCard,
      },
    );
    expect(result).toEqual(updatedClientfile);
  });

  it('should update a clientfile proof of address', async () => {
    const files = {
      proofOfAddress: [
        {
          originalname: 'proof-of-address.jpg',
          buffer: Buffer.from('address'),
          mimetype: 'image/jpeg',
        },
      ],
    } as unknown as {
      identityCard?: Array<Express.Multer.File>;
      proofOfAddress?: Array<Express.Multer.File>;
    };
    const updatedClientfile = {
      id: '3',
      proofOfAddress,
    };

    mockClientfileService.checkUpdate.mockResolvedValue(undefined);
    mockSupabaseStorageService.uploadFile.mockResolvedValue(proofOfAddress);
    mockClientfileService.update.mockResolvedValue(updatedClientfile);

    const result = await controller.update(3, {}, files, request);

    expect(mockClientfileService.update).toHaveBeenCalledWith(
      UserRole.User,
      2,
      3,
      {
        proofOfAddress,
      },
    );
    expect(result).toEqual(updatedClientfile);
  });

  it('should not update when file buffer is missing', async () => {
    mockClientfileService.checkUpdate.mockResolvedValue(undefined);

    const result = controller.update(
      3,
      {},
      {
        identityCard: [
          {
            originalname: 'identity-card.jpg',
            mimetype: 'image/jpeg',
          },
        ],
      } as unknown as {
        identityCard?: Array<Express.Multer.File>;
        proofOfAddress?: Array<Express.Multer.File>;
      },
      request,
    );

    await expect(result).rejects.toHaveProperty('status', 400);
    expect(mockClientfileService.update).not.toHaveBeenCalled();
  });

  it('should not upload files when user cannot update a clientfile', async () => {
    mockClientfileService.checkUpdate.mockRejectedValue(
      new HttpException('User cannot update another user file', 403),
    );

    const result = controller.update(
      3,
      { insurance: 'false' },
      {
        identityCard: [
          {
            originalname: 'identity-card.jpg',
            buffer: Buffer.from('identity'),
            mimetype: 'image/jpeg',
          },
        ],
      } as unknown as {
        identityCard: Array<Express.Multer.File>;
        proofOfAddress?: Array<Express.Multer.File>;
      },
      request,
    );

    await expect(result).rejects.toHaveProperty('status', 403);
    expect(mockSupabaseStorageService.uploadFile).not.toHaveBeenCalled();
    expect(mockClientfileService.update).not.toHaveBeenCalled();
  });

  it('should update a clientfile status', async () => {
    const mockClientfile = {
      id: 3,
      status: Status.Accepted,
    };
    mockClientfileService.updateStatus.mockResolvedValue(mockClientfile);

    const result = await controller.updateStatus(3, Status.Accepted);

    expect(mockClientfileService.updateStatus).toHaveBeenCalledWith(
      3,
      Status.Accepted,
    );
    expect(result).toEqual(mockClientfile);
  });

  it('should cancel the current user pending submission', async () => {
    mockClientfileService.cancelSubmission.mockResolvedValue(undefined);

    const result = await controller.cancelSubmission(request);

    expect(mockClientfileService.cancelSubmission).toHaveBeenCalledWith(
      2,
      UserRole.User,
    );
    expect(result).toBeUndefined();
  });

  it('should remove one clientfile by id', async () => {
    mockClientfileService.remove.mockResolvedValue(undefined);

    const result = await controller.remove(3);

    expect(mockClientfileService.remove).toHaveBeenCalledWith(3);
    expect(result).toBeUndefined();
  });

  it('should not remove one clientfile by id and throw error', async () => {
    mockClientfileService.remove.mockRejectedValue(
      new NotFoundException('Clientfile with id 3 not found'),
    );

    const result = controller.remove(3);

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });
});
