import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CarsService } from './cars.service';
import { CarEntity } from './entities/car.entity';
import { baseCarDto } from './dto/base-car.dto';
import { Service } from './service.enum';
import { SupabaseStorageService } from '../utilities/supabase-storage/supabase-storage.service';
import { Status } from '../clientfile/status.enum';

type MockCarRepository = {
  save: jest.Mock;
  find: jest.Mock;
  findOne: jest.Mock;
  findOneOrFail: jest.Mock;
  remove: jest.Mock;
};

type MockSupabaseStorageService = {
  deleteFile: jest.Mock;
  getPathFromUrl: jest.Mock;
};

describe('CarsService', () => {
  let service: CarsService;
  let mockCarRepository: MockCarRepository;
  let mockSupabaseStorageService: MockSupabaseStorageService;
  const genesisGv80Image =
    'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80.jpg';
  const genesisGv80SaleImage =
    'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80-sale.jpg';
  const oldImage =
    'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80-old.jpg';
  const newImage =
    'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80-new.jpg';
  const deleteImage =
    'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80-delete.jpg';
  const user = {
    id: 2,
    email: 'user@gmail.com',
    name: 'Maria',
    surname: 'Marie',
  };

  beforeEach(async () => {
    mockCarRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      remove: jest.fn(),
    };
    mockSupabaseStorageService = {
      deleteFile: jest.fn(),
      getPathFromUrl: jest.fn((url: string) => {
        try {
          const pathname = new URL(url).pathname;
          return pathname
            .replace('/storage/v1/object/public/images/', '')
            .replace(/^\/+/, '');
        } catch {
          return url.replace(/^\/+/, '');
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarsService,
        {
          provide: getRepositoryToken(CarEntity),
          useValue: mockCarRepository,
        },
        {
          provide: SupabaseStorageService,
          useValue: mockSupabaseStorageService,
        },
      ],
    }).compile();

    service = module.get<CarsService>(CarsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a leasing car successfully', async () => {
      const createCarDto = {
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [genesisGv80Image],
      };
      const savedCar = { id: 1, ...createCarDto, service: Service.Leasing };

      mockCarRepository.save.mockResolvedValue(savedCar);

      const result: unknown = await service.create(createCarDto);

      expect(mockCarRepository.save).toHaveBeenCalledWith({
        ...createCarDto,
        service: Service.Leasing,
      });
      expect(result).toEqual(savedCar);
    });

    it('should create a sale car successfully', async () => {
      const createCarDto = {
        brand: 'Genesis',
        model: 'GV80',
        price: '42000.00',
        service: Service.Sale,
        images: [genesisGv80SaleImage],
      };
      const savedCar = { id: 2, ...createCarDto, service: Service.Sale };

      mockCarRepository.save.mockResolvedValue(savedCar);

      const result: unknown = await service.create(createCarDto);

      expect(mockCarRepository.save).toHaveBeenCalledWith({
        ...createCarDto,
        service: Service.Sale,
      });
      expect(result).toEqual(savedCar);
    });

    it('should throw an error when service is invalid', async () => {
      await expect(
        service.create({
          brand: 'Genesis',
          model: 'GV80',
          price: '75000.00',
          service: 'Rental' as Service,
        }),
      ).rejects.toThrow('Invalid service');
      expect(mockCarRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return an array of cars', async () => {
      const mockCars = [
        {
          id: 1,
          brand: 'Genesis',
          model: 'GV80',
          price: '75000.00',
          service: Service.Leasing,
          images: [genesisGv80Image],
          isAvailable: true,
        },
        {
          id: 2,
          brand: 'Genesis',
          model: 'GV80',
          price: '42000.00',
          service: Service.Sale,
          images: [genesisGv80SaleImage],
          isAvailable: true,
        },
      ];

      mockCarRepository.find.mockResolvedValue(mockCars);

      const result = await service.findAll();

      expect(mockCarRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(baseCarDto);
      expect(result[0].id).toBe('1');
      expect(result[0].brand).toBe('Genesis');
      expect(result[0].model).toBe('GV80');
      expect(result[1].service).toBe(Service.Sale);
      expect(result[0].isAvailable).toBe(true);
    });

    it('should return an empty array when no cars exist', async () => {
      mockCarRepository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findAllByService', () => {
    it('should return cars by service', async () => {
      const mockCars = [
        {
          id: 1,
          brand: 'Genesis',
          model: 'GV80',
          price: '75000.00',
          service: Service.Leasing,
          images: [genesisGv80Image],
        },
      ];

      mockCarRepository.find.mockResolvedValue(mockCars);

      const result = await service.findAllByService(Service.Leasing);

      expect(mockCarRepository.find).toHaveBeenCalledWith({
        where: { service: Service.Leasing },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(baseCarDto);
      expect(result[0].service).toBe(Service.Leasing);
    });

    it('should throw an error when service is invalid', async () => {
      await expect(
        service.findAllByService('Rental' as Service),
      ).rejects.toThrow('Invalid service');
      expect(mockCarRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findAllByStatus', () => {
    it('should return available cars', async () => {
      const mockCars = [
        {
          id: 1,
          brand: 'Genesis',
          model: 'GV80',
          price: '75000.00',
          service: Service.Leasing,
          images: [genesisGv80Image],
          isAvailable: true,
        },
      ];

      mockCarRepository.find.mockResolvedValue(mockCars);

      const result = await service.findAllByStatus('available');

      expect(mockCarRepository.find).toHaveBeenCalledWith({
        where: { isAvailable: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(baseCarDto);
      expect(result[0].brand).toBe('Genesis');
      expect(result[0].model).toBe('GV80');
      expect(result[0].isAvailable).toBe(true);
    });

    it('should throw an error when status is invalid', async () => {
      await expect(service.findAllByStatus('archived')).rejects.toThrow(
        'Invalid status',
      );
      expect(mockCarRepository.find).not.toHaveBeenCalled();
    });

    it('should return unavailable cars', async () => {
      const mockCars = [
        {
          id: 1,
          brand: 'Genesis',
          model: 'GV80',
          price: '75000.00',
          service: Service.Leasing,
          images: [genesisGv80Image],
          isAvailable: false,
        },
      ];

      mockCarRepository.find.mockResolvedValue(mockCars);

      const result = await service.findAllByStatus('unavailable');

      expect(mockCarRepository.find).toHaveBeenCalledWith({
        where: { isAvailable: false },
      });
      expect(result).toHaveLength(1);
      expect(result[0].brand).toBe('Genesis');
      expect(result[0].model).toBe('GV80');
      expect(result[0].isAvailable).toBe(false);
    });
  });

  describe('findOne', () => {
    it('should return a car by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [genesisGv80Image],
      };

      mockCarRepository.findOne.mockResolvedValue(mockCar);

      const result = await service.findOne(1);

      expect(mockCarRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeInstanceOf(baseCarDto);
      expect(result.id).toBe('1');
      expect(result.brand).toBe('Genesis');
      expect(result.model).toBe('GV80');
    });

    it('should throw an error when car is not found', async () => {
      mockCarRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(
        'Car with id 999 not found',
      );
    });
  });

  describe('findOneForEmployees', () => {
    it('should return a car with clientfile previews', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [genesisGv80Image],
        isAvailable: true,
        clientFiles: [
          {
            id: 3,
            status: Status.Pending,
            user,
          },
        ],
      };

      mockCarRepository.findOne.mockResolvedValue(mockCar);

      const result = await service.findOneForEmployees(1);

      expect(mockCarRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['clientFiles', 'clientFiles.user'],
      });
      expect(result.brand).toBe('Genesis');
      expect(result.model).toBe('GV80');
      expect(result.clientFiles).toEqual([
        {
          id: '3',
          status: Status.Pending,
          userId: '2',
          name: 'Maria',
          surname: 'Marie',
        },
      ]);
    });

    it('should return a car without clientfile previews', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [genesisGv80Image],
        isAvailable: true,
      };

      mockCarRepository.findOne.mockResolvedValue(mockCar);

      const result = await service.findOneForEmployees(1);

      expect(result.clientFiles).toBeUndefined();
      expect(result.brand).toBe('Genesis');
      expect(result.model).toBe('GV80');
    });

    it('should throw an error when car for employees is not found', async () => {
      mockCarRepository.findOne.mockResolvedValue(null);

      await expect(service.findOneForEmployees(999)).rejects.toThrow(
        'Car with id 999 not found',
      );
    });
  });

  describe('update', () => {
    it('should update a car by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [oldImage],
      };
      const updateCarDto = {
        brand: 'Genesis',
        images: [newImage],
      };
      const updatedCar = {
        ...mockCar,
        brand: 'Genesis',
        images: [oldImage, newImage],
      };

      mockCarRepository.findOne.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(updatedCar);

      const result = await service.update(1, updateCarDto);

      expect(mockCarRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCarRepository.save).toHaveBeenCalledWith(updatedCar);
      expect(result).toEqual(updatedCar);
    });

    it('should throw an error when car to update is not found', async () => {
      mockCarRepository.findOne.mockResolvedValue(null);

      await expect(service.update(999, { brand: 'Genesis' })).rejects.toThrow(
        'Car with id 999 not found',
      );
    });

    it('should not update service when the car is unavailable', async () => {
      mockCarRepository.findOne.mockResolvedValue({
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [],
        isAvailable: false,
      });

      await expect(
        service.update(1, { service: Service.Sale }),
      ).rejects.toThrow('Car is not available');
      expect(mockCarRepository.save).not.toHaveBeenCalled();
    });

    it('should update images when car has no images yet', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: undefined,
      };
      const updatedCar = {
        ...mockCar,
        images: [newImage],
      };

      mockCarRepository.findOne.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(updatedCar);

      const result = await service.update(1, { images: [newImage] });

      expect(mockCarRepository.save).toHaveBeenCalledWith(updatedCar);
      expect(result).toEqual(updatedCar);
    });
  });

  describe('updateService', () => {
    it('should update a car service by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [],
      };
      const updatedCar = { ...mockCar, service: Service.Sale };

      mockCarRepository.findOne.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(updatedCar);

      const result = await service.updateService(1, Service.Sale);

      expect(mockCarRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCarRepository.save).toHaveBeenCalledWith(updatedCar);
      expect(result).toEqual(updatedCar);
    });

    it('should not update a car service when the car is unavailable', async () => {
      mockCarRepository.findOne.mockResolvedValue({
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [],
        isAvailable: false,
      });

      await expect(service.updateService(1, Service.Sale)).rejects.toThrow(
        'Car is not available',
      );
      expect(mockCarRepository.save).not.toHaveBeenCalled();
    });

    it('should not update a car service when service is invalid', async () => {
      await expect(service.updateService(1, 'Rental' as Service)).rejects.toThrow(
        'Invalid service',
      );
      expect(mockCarRepository.findOne).not.toHaveBeenCalled();
      expect(mockCarRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a car by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [],
      };

      mockCarRepository.findOne.mockResolvedValue(mockCar);
      mockCarRepository.remove.mockResolvedValue(mockCar);

      const result = await service.remove(1);

      expect(mockCarRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCarRepository.remove).toHaveBeenCalledWith(mockCar);
      expect(result).toEqual(mockCar);
    });

    it('should throw an error when car to remove is not found', async () => {
      mockCarRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(
        'Car with id 999 not found',
      );
    });
  });

  describe('deleteImage', () => {
    it('should delete an image from a car by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [oldImage, deleteImage],
      };
      const savedCar = { ...mockCar, images: [oldImage] };

      mockCarRepository.findOne.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(savedCar);
      mockSupabaseStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await service.deleteImage(
        1,
        'cars/genesis-gv80-delete.jpg',
      );

      expect(mockCarRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCarRepository.save).toHaveBeenCalledWith(savedCar);
      expect(mockSupabaseStorageService.deleteFile).toHaveBeenCalledWith(
        deleteImage,
      );
      expect(result).toEqual(savedCar);
    });

    it('should delete a Supabase image when the full URL is provided', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [oldImage, deleteImage],
      };
      const savedCar = { ...mockCar, images: [oldImage] };

      mockCarRepository.findOne.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(savedCar);
      mockSupabaseStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await service.deleteImage(1, deleteImage);

      expect(mockCarRepository.save).toHaveBeenCalledWith(savedCar);
      expect(mockSupabaseStorageService.deleteFile).toHaveBeenCalledWith(
        deleteImage,
      );
      expect(result).toEqual(savedCar);
    });

    it('should delete a Supabase image when only the storage path is provided', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [genesisGv80Image],
      };
      const savedCar = { ...mockCar, images: [] };

      mockCarRepository.findOne.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(savedCar);
      mockSupabaseStorageService.deleteFile.mockResolvedValue(undefined);

      const result = await service.deleteImage(1, 'cars/genesis-gv80.jpg');

      expect(mockCarRepository.save).toHaveBeenCalledWith(savedCar);
      expect(mockSupabaseStorageService.deleteFile).toHaveBeenCalledWith(
        genesisGv80Image,
      );
      expect(result).toEqual(savedCar);
    });

    it('should throw an error when image does not belong to the car', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: [oldImage],
      };

      mockCarRepository.findOne.mockResolvedValue(mockCar);

      await expect(
        service.deleteImage(1, 'cars/genesis-gv80-missing.jpg'),
      ).rejects.toThrow('Could not find image');
      expect(mockCarRepository.save).not.toHaveBeenCalled();
      expect(mockSupabaseStorageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should throw an error when car has no images', async () => {
      const mockCar = {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
        images: undefined,
      };

      mockCarRepository.findOne.mockResolvedValue(mockCar);

      await expect(
        service.deleteImage(1, 'cars/genesis-gv80.jpg'),
      ).rejects.toThrow('Could not find image');
      expect(mockCarRepository.save).not.toHaveBeenCalled();
      expect(mockSupabaseStorageService.deleteFile).not.toHaveBeenCalled();
    });
  });
});
