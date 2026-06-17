import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientfileService } from './clientfile.service';
import { ClientFileEntity } from './entities/clientfile.entity';
import { CarEntity } from '../cars/entities/car.entity';
import { Status } from './status.enum';
import { UserRole } from '../user/role.enum';
import { Service } from '../cars/service.enum';
import { BaseClientfileDto } from './dto/base-clientfile.dto';
import { BaseUserDto } from '../user/dto/base-user.dto';
import { baseCarDto } from '../cars/dto/base-car.dto';

type MockClientfileRepository = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  findOneOrFail: jest.Mock;
  remove: jest.Mock;
};

type MockCarRepository = {
  save: jest.Mock;
  findOne: jest.Mock;
  findOneOrFail: jest.Mock;
};

describe('ClientfileService', () => {
  let service: ClientfileService;
  let mockClientfileRepository: MockClientfileRepository;
  let mockCarRepository: MockCarRepository;

  const genesisGv80Image =
    'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80.jpg';
  const identityCard =
    'https://example.supabase.co/storage/v1/object/public/images/clientfiles/identity-card.jpg';
  const proofOfAddress =
    'https://example.supabase.co/storage/v1/object/public/images/clientfiles/proof-of-address.jpg';
  const updatedIdentityCard =
    'https://example.supabase.co/storage/v1/object/public/images/clientfiles/identity-card-updated.jpg';
  const updatedProofOfAddress =
    'https://example.supabase.co/storage/v1/object/public/images/clientfiles/proof-of-address-updated.jpg';
  const birthday = new Date('1994-04-12');
  const dateSubmitted = new Date('2026-05-06');

  const genesisGv80 = {
    id: 1,
    brand: 'Genesis',
    model: 'GV80',
    price: '75000.00',
    service: Service.Leasing,
    images: [genesisGv80Image],
    isAvailable: true,
  };

  const genesisGv80Sale = {
    ...genesisGv80,
    service: Service.Sale,
  };

  const user = {
    id: 2,
    email: 'user@gmail.com',
    name: 'Maria',
    surname: 'Marie',
    birthday,
    password: 'secret',
    role: UserRole.User,
  };

  const pendingClientfile = {
    id: 3,
    carId: genesisGv80.id,
    userId: user.id,
    car: genesisGv80,
    user,
    status: Status.Pending,
    dateSubmitted,
    identityCard,
    proofOfAddress,
    insurance: true,
    roadsideAssistance: false,
    maintenance: true,
    technicalControl: false,
  };

  const saleClientfile = {
    ...pendingClientfile,
    car: genesisGv80Sale,
    insurance: false,
    roadsideAssistance: false,
    maintenance: false,
    technicalControl: false,
  };

  beforeEach(async () => {
    mockClientfileRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      remove: jest.fn(),
    };
    mockCarRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientfileService,
        {
          provide: getRepositoryToken(ClientFileEntity),
          useValue: mockClientfileRepository,
        },
        {
          provide: getRepositoryToken(CarEntity),
          useValue: mockCarRepository,
        },
      ],
    }).compile();

    service = module.get<ClientfileService>(ClientfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a clientfile successfully', async () => {
      const createClientfileDto = {
        carId: '1',
        userId: '2',
        identityCard,
        proofOfAddress,
        insurance: 'true',
        roadsideAssistance: 'false',
        maintenance: 'true',
        technicalControl: 'false',
      };
      const createdClientfile = {
        ...pendingClientfile,
      };

      mockClientfileRepository.create.mockReturnValue(createdClientfile);
      mockClientfileRepository.save.mockResolvedValue(createdClientfile);
      mockCarRepository.findOne.mockResolvedValue(genesisGv80);

      const result = await service.create(createClientfileDto);

      expect(mockCarRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockClientfileRepository.create).toHaveBeenCalledWith({
        ...createClientfileDto,
        carId: 1,
        userId: 2,
        insurance: true,
        roadsideAssistance: false,
        maintenance: true,
        technicalControl: false,
      });
      expect(mockClientfileRepository.save).toHaveBeenCalledWith(
        createdClientfile,
      );
      expect(result).toEqual(createdClientfile);
    });

    it('should not create a clientfile for an unavailable car', async () => {
      const createClientfileDto = {
        carId: '1',
        userId: '2',
        identityCard,
        proofOfAddress,
        insurance: 'true',
        roadsideAssistance: 'false',
        maintenance: 'true',
        technicalControl: 'false',
      };

      mockCarRepository.findOne.mockResolvedValue({
        ...genesisGv80,
        isAvailable: false,
      });

      await expect(service.create(createClientfileDto)).rejects.toThrow(
        'Car is not available',
      );
      expect(mockClientfileRepository.create).not.toHaveBeenCalled();
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should not create a clientfile when user already has a pending file', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(pendingClientfile);

      await expect(
        service.create({
          carId: '1',
          userId: '2',
          identityCard,
          proofOfAddress,
          insurance: 'true',
          roadsideAssistance: 'false',
          maintenance: 'true',
          technicalControl: 'false',
        }),
      ).rejects.toThrow('User already has a pending clientfile');
      expect(mockCarRepository.findOne).not.toHaveBeenCalled();
      expect(mockClientfileRepository.create).not.toHaveBeenCalled();
    });

    it('should not create a clientfile when car is not found', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(null);
      mockCarRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          carId: '1',
          userId: '2',
          identityCard,
          proofOfAddress,
          insurance: 'true',
          roadsideAssistance: 'false',
          maintenance: 'true',
          technicalControl: 'false',
        }),
      ).rejects.toThrow('Car with id 1 not found');
      expect(mockClientfileRepository.create).not.toHaveBeenCalled();
    });

    it('should require options when creating a leasing clientfile', async () => {
      const createClientfileDto = {
        carId: '1',
        userId: '2',
        identityCard,
        proofOfAddress,
      };

      mockCarRepository.findOne.mockResolvedValue(genesisGv80);

      await expect(service.create(createClientfileDto)).rejects.toThrow(
        'Leasing options are required',
      );
      expect(mockClientfileRepository.create).not.toHaveBeenCalled();
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should not create a sale clientfile with true options', async () => {
      const createClientfileDto = {
        carId: '1',
        userId: '2',
        identityCard,
        proofOfAddress,
        insurance: 'true',
      };

      mockCarRepository.findOne.mockResolvedValue(genesisGv80Sale);

      await expect(service.create(createClientfileDto)).rejects.toThrow(
        'Options are only available for leasing cars',
      );
      expect(mockClientfileRepository.create).not.toHaveBeenCalled();
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should create a sale clientfile with false options', async () => {
      const createClientfileDto = {
        carId: '1',
        userId: '2',
        identityCard,
        proofOfAddress,
      };
      const createdClientfile = {
        ...saleClientfile,
      };

      mockClientfileRepository.create.mockReturnValue(createdClientfile);
      mockClientfileRepository.save.mockResolvedValue(createdClientfile);
      mockCarRepository.findOne.mockResolvedValue(genesisGv80Sale);

      const result = await service.create(createClientfileDto);

      expect(mockClientfileRepository.create).toHaveBeenCalledWith({
        ...createClientfileDto,
        carId: 1,
        userId: 2,
        insurance: false,
        roadsideAssistance: false,
        maintenance: false,
        technicalControl: false,
      });
      expect(result).toEqual({
        id: 3,
        carId: genesisGv80.id,
        userId: user.id,
        car: genesisGv80Sale,
        user,
        status: Status.Pending,
        dateSubmitted,
        identityCard,
        proofOfAddress,
      });
    });
  });

  describe('findAll', () => {
    it('should return all clientfiles with user and car for employees', async () => {
      mockClientfileRepository.find.mockResolvedValue([pendingClientfile]);

      const result = await service.findAll(UserRole.Employee, user.id);

      expect(mockClientfileRepository.find).toHaveBeenCalledWith({
        where: {},
        relations: ['user', 'car'],
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(BaseClientfileDto);
      expect(result[0].user).toBeInstanceOf(BaseUserDto);
      expect(result[0].car).toBeInstanceOf(baseCarDto);
      expect(result[0].user?.email).toBe(user.email);
      expect(result[0].car?.brand).toBe('Genesis');
      expect(result[0].car?.model).toBe('GV80');
    });

    it('should return only the current user clientfiles without user data', async () => {
      mockClientfileRepository.find.mockResolvedValue([pendingClientfile]);

      const result = await service.findAll(UserRole.User, user.id);

      expect(mockClientfileRepository.find).toHaveBeenCalledWith({
        where: { userId: user.id },
        relations: ['user', 'car'],
      });
      expect(result[0].user).toBeUndefined();
      expect(result[0].car?.brand).toBe('Genesis');
      expect(result[0].car?.model).toBe('GV80');
    });

    it('should not return options for sale clientfiles', async () => {
      mockClientfileRepository.find.mockResolvedValue([saleClientfile]);

      const result = await service.findAll(UserRole.User, user.id);

      expect(result[0].insurance).toBeUndefined();
      expect(result[0].roadsideAssistance).toBeUndefined();
      expect(result[0].maintenance).toBeUndefined();
      expect(result[0].technicalControl).toBeUndefined();
      expect(result[0].car?.brand).toBe('Genesis');
      expect(result[0].car?.model).toBe('GV80');
    });
  });

  describe('findAllByStatus', () => {
    it('should return clientfiles by status', async () => {
      mockClientfileRepository.find.mockResolvedValue([pendingClientfile]);

      const result = await service.findAllByStatus(Status.Pending);

      expect(mockClientfileRepository.find).toHaveBeenCalledWith({
        where: { status: Status.Pending },
        relations: ['user', 'car'],
      });
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe(Status.Pending);
      expect(result[0].user?.email).toBe(user.email);
      expect(result[0].car?.brand).toBe('Genesis');
      expect(result[0].car?.model).toBe('GV80');
    });

    it('should throw an error when status is invalid', async () => {
      await expect(
        service.findAllByStatus('Unknown' as Status),
      ).rejects.toThrow('Invalid status');
      expect(mockClientfileRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a clientfile with user and car for employees', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(pendingClientfile);

      const result = await service.findOne(UserRole.Employee, user.id, 3);

      expect(mockClientfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: ['user', 'car'],
      });
      expect(result.user).toBeInstanceOf(BaseUserDto);
      expect(result.car).toBeInstanceOf(baseCarDto);
      expect(result.user?.email).toBe(user.email);
      expect(result.car?.model).toBe('GV80');
    });

    it('should block users from seeing another user clientfile', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
        userId: 99,
      });

      await expect(service.findOne(UserRole.User, user.id, 3)).rejects.toThrow(
        'User cannot access other user file',
      );
    });

    it('should return current user clientfile without user data', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(pendingClientfile);

      const result = await service.findOne(UserRole.User, user.id);

      expect(mockClientfileRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id },
        relations: ['car'],
      });
      expect(result.user).toBeUndefined();
      expect(result.car?.brand).toBe('Genesis');
      expect(result.car?.model).toBe('GV80');
    });

    it('should throw when current user clientfile is not found', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(UserRole.User, user.id)).rejects.toThrow(
        'Clientfile not found',
      );
    });

    it('should throw when clientfile by id is not found', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(UserRole.Employee, user.id, 999)).rejects.toThrow(
        'Clientfile with id 999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update a clientfile and return user data for employees', async () => {
      const savedClientfile = {
        ...pendingClientfile,
        insurance: false,
      };

      mockClientfileRepository.findOne
        .mockResolvedValueOnce(pendingClientfile)
        .mockResolvedValueOnce(pendingClientfile)
        .mockResolvedValueOnce(savedClientfile);
      mockClientfileRepository.save.mockResolvedValue(savedClientfile);

      const result = await service.update(UserRole.Employee, user.id, 3, {
        insurance: 'false',
      });

      expect(mockClientfileRepository.save).toHaveBeenCalledWith({
        ...pendingClientfile,
        insurance: false,
      });
      expect(result.insurance).toBe(false);
      expect(result.user?.email).toBe(user.email);
      expect(result.car?.brand).toBe('Genesis');
      expect(result.car?.model).toBe('GV80');
    });

    it('should update clientfile documents and leasing options', async () => {
      const savedClientfile = {
        ...pendingClientfile,
        identityCard: updatedIdentityCard,
        proofOfAddress: updatedProofOfAddress,
        roadsideAssistance: true,
        maintenance: false,
        technicalControl: true,
      };

      mockClientfileRepository.findOne
        .mockResolvedValueOnce(pendingClientfile)
        .mockResolvedValueOnce(pendingClientfile)
        .mockResolvedValueOnce(savedClientfile);
      mockClientfileRepository.save.mockResolvedValue(savedClientfile);

      const result = await service.update(UserRole.User, user.id, 3, {
        identityCard: updatedIdentityCard,
        proofOfAddress: updatedProofOfAddress,
        roadsideAssistance: 'true',
        maintenance: 'false',
        technicalControl: 'true',
      });

      expect(mockClientfileRepository.save).toHaveBeenCalledWith({
        ...pendingClientfile,
        identityCard: updatedIdentityCard,
        proofOfAddress: updatedProofOfAddress,
        roadsideAssistance: true,
        maintenance: false,
        technicalControl: true,
      });
      expect(result.roadsideAssistance).toBe(true);
      expect(result.maintenance).toBe(false);
      expect(result.technicalControl).toBe(true);
    });

    it('should update a sale clientfile without options', async () => {
      mockClientfileRepository.findOne
        .mockResolvedValueOnce(saleClientfile)
        .mockResolvedValueOnce(saleClientfile)
        .mockResolvedValueOnce(saleClientfile);
      mockClientfileRepository.save.mockResolvedValue(saleClientfile);

      const result = await service.update(UserRole.User, user.id, 3, {
        identityCard,
      });

      expect(mockClientfileRepository.save).toHaveBeenCalledWith({
        ...saleClientfile,
        identityCard,
        insurance: false,
        roadsideAssistance: false,
        maintenance: false,
        technicalControl: false,
      });
      expect(result.insurance).toBeUndefined();
      expect(result.car?.service).toBe(Service.Sale);
    });

    it('should not update accepted clientfiles', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
        status: Status.Accepted,
      });

      await expect(
        service.update(UserRole.User, user.id, 3, { insurance: 'false' }),
      ).rejects.toThrow('Cannot update already accepted client file');
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should not update canceled clientfiles', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
        status: Status.Canceled,
      });

      await expect(
        service.update(UserRole.User, user.id, 3, { insurance: 'false' }),
      ).rejects.toThrow('Cannot update canceled client file');
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should not update rejected clientfiles', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
        status: Status.Rejected,
      });

      await expect(
        service.update(UserRole.User, user.id, 3, { insurance: 'false' }),
      ).rejects.toThrow('Cannot update already rejected client file');
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should block users from updating another user clientfile', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
        userId: 99,
      });

      await expect(
        service.update(UserRole.User, user.id, 3, { insurance: 'false' }),
      ).rejects.toThrow('User cannot update another user file');
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should not update a sale clientfile with true options', async () => {
      mockClientfileRepository.findOne
        .mockResolvedValueOnce(saleClientfile)
        .mockResolvedValueOnce(saleClientfile);

      await expect(
        service.update(UserRole.User, user.id, 3, { insurance: 'true' }),
      ).rejects.toThrow('Options are only available for leasing cars');
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('should accept a clientfile and mark the car unavailable', async () => {
      const clientfile = {
        ...pendingClientfile,
        car: {
          ...genesisGv80,
        },
      };

      mockClientfileRepository.findOne.mockResolvedValue(clientfile);
      mockClientfileRepository.save.mockResolvedValue({
        ...clientfile,
        status: Status.Accepted,
      });
      mockCarRepository.save.mockResolvedValue({
        ...genesisGv80,
        isAvailable: false,
      });

      const result = await service.updateStatus(3, Status.Accepted);

      expect(mockClientfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: ['user', 'car'],
      });
      expect(mockCarRepository.save).toHaveBeenCalledWith({
        ...genesisGv80,
        isAvailable: false,
      });
      expect(mockClientfileRepository.save).toHaveBeenCalledWith({
        ...clientfile,
        status: Status.Accepted,
        car: {
          ...genesisGv80,
          isAvailable: false,
        },
      });
      expect(result.status).toBe(Status.Accepted);
      expect(result.user?.email).toBe(user.email);
      expect(result.car?.brand).toBe('Genesis');
      expect(result.car?.model).toBe('GV80');
    });

    it('should not update status when clientfile is not pending', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
        status: Status.Canceled,
      });

      await expect(service.updateStatus(3, Status.Accepted)).rejects.toThrow(
        'Only pending status client files can be updated',
      );
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
      expect(mockCarRepository.save).not.toHaveBeenCalled();
    });

    it('should not update status when status is invalid', async () => {
      await expect(
        service.updateStatus(3, 'Unknown' as Status),
      ).rejects.toThrow('Invalid status');
      expect(mockClientfileRepository.findOne).not.toHaveBeenCalled();
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should not update status when the car is unavailable', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
        car: {
          ...genesisGv80,
          isAvailable: false,
        },
      });

      await expect(service.updateStatus(3, Status.Rejected)).rejects.toThrow(
        'Car is not available',
      );
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
      expect(mockCarRepository.save).not.toHaveBeenCalled();
    });

    it('should load the car when updating status without a car relation', async () => {
      const clientfile = {
        ...pendingClientfile,
        car: undefined,
      };

      mockClientfileRepository.findOne.mockResolvedValue(clientfile);
      mockCarRepository.findOne.mockResolvedValue(genesisGv80);
      mockClientfileRepository.save.mockResolvedValue({
        ...clientfile,
        car: genesisGv80,
        status: Status.Rejected,
      });

      const result = await service.updateStatus(3, Status.Rejected);

      expect(mockCarRepository.findOne).toHaveBeenCalledWith({
        where: { id: genesisGv80.id },
      });
      expect(mockCarRepository.save).not.toHaveBeenCalled();
      expect(result.status).toBe(Status.Rejected);
      expect(result.car?.brand).toBe('Genesis');
      expect(result.car?.model).toBe('GV80');
    });

    it('should not return options when updating status for a sale clientfile', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(saleClientfile);
      mockClientfileRepository.save.mockResolvedValue(saleClientfile);

      const result = await service.updateStatus(3, Status.Rejected);

      expect(result).toEqual({
        id: '3',
        car: {
          id: '1',
          brand: 'Genesis',
          model: 'GV80',
          price: '75000.00',
          service: Service.Sale,
          images: [genesisGv80Image],
          isAvailable: true,
        },
        user: {
          id: '2',
          email: 'user@gmail.com',
          name: 'Maria',
          surname: 'Marie',
          birthday,
        },
        status: Status.Rejected,
        dateSubmitted,
        identityCard,
        proofOfAddress,
      });
    });
  });

  describe('cancelSubmission', () => {
    it('should cancel a pending clientfile', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
      });
      mockClientfileRepository.save.mockResolvedValue({
        ...pendingClientfile,
        status: Status.Canceled,
      });
      mockClientfileRepository.find.mockResolvedValue([
        {
          ...pendingClientfile,
          status: Status.Canceled,
        },
      ]);

      await service.cancelSubmission(user.id, UserRole.User);

      expect(mockClientfileRepository.findOne).toHaveBeenCalledWith({
        where: { userId: user.id, status: Status.Pending },
      });
      expect(mockClientfileRepository.save).toHaveBeenCalledWith({
        ...pendingClientfile,
        status: Status.Canceled,
      });
    });

    it('should throw when no pending clientfile exists', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(null);

      await expect(
        service.cancelSubmission(user.id, UserRole.User),
      ).rejects.toThrow('No pending client file');
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });

    it('should block users from canceling another user submission', async () => {
      mockClientfileRepository.findOne.mockResolvedValue({
        ...pendingClientfile,
        userId: 99,
      });

      await expect(
        service.cancelSubmission(user.id, UserRole.User),
      ).rejects.toThrow('User cannot cancel anoter user submission');
      expect(mockClientfileRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a clientfile by id', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(pendingClientfile);
      mockClientfileRepository.remove.mockResolvedValue(pendingClientfile);

      const result = await service.remove(3);

      expect(mockClientfileRepository.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: [],
      });
      expect(mockClientfileRepository.remove).toHaveBeenCalledWith(
        pendingClientfile,
      );
      expect(result).toEqual(pendingClientfile);
    });

    it('should throw when clientfile to remove is not found', async () => {
      mockClientfileRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Clientfile with id 999 not found',
      );
      expect(mockClientfileRepository.remove).not.toHaveBeenCalled();
    });
  });
});
