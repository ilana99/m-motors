import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CarsService } from './cars.service';
import { CarEntity } from './entities/car.entity';
import { baseCarDto } from './dto/base-car.dto';
import { Service } from './service.enum';
import { unlink } from 'fs/promises';
import { join } from 'path';

jest.mock('fs/promises', () => ({
  unlink: jest.fn(),
}));

type MockCarRepository = {
  save: jest.Mock;
  find: jest.Mock;
  findOneOrFail: jest.Mock;
  remove: jest.Mock;
};

describe('CarsService', () => {
  let service: CarsService;
  let mockCarRepository: MockCarRepository;

  beforeEach(async () => {
    mockCarRepository = {
      save: jest.fn(),
      find: jest.fn(),
      findOneOrFail: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CarsService,
        {
          provide: getRepositoryToken(CarEntity),
          useValue: mockCarRepository,
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
        brand: 'BMW',
        model: 'X5',
        price: '75000.00',
        service: Service.Leasing,
        images: ['/uploads/bmw.jpg'],
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
        brand: 'Audi',
        model: 'A4',
        price: '42000.00',
        service: Service.Sale,
        images: ['/uploads/audi.jpg'],
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
  });

  describe('findAll', () => {
    it('should return an array of cars', async () => {
      const mockCars = [
        {
          id: 1,
          brand: 'BMW',
          model: 'X5',
          price: '75000.00',
          service: Service.Leasing,
          images: ['/uploads/bmw.jpg'],
        },
        {
          id: 2,
          brand: 'Audi',
          model: 'A4',
          price: '42000.00',
          service: Service.Sale,
          images: ['/uploads/audi.jpg'],
        },
      ];

      mockCarRepository.find.mockResolvedValue(mockCars);

      const result = await service.findAll();

      expect(mockCarRepository.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toBeInstanceOf(baseCarDto);
      expect(result[0].id).toBe('1');
      expect(result[0].brand).toBe('BMW');
      expect(result[1].service).toBe(Service.Sale);
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
          brand: 'BMW',
          model: 'X5',
          price: '75000.00',
          service: Service.Leasing,
          images: ['/uploads/bmw.jpg'],
        },
      ];

      mockCarRepository.find.mockResolvedValue(mockCars);

      const result = await service.findAllByService('Leasing');

      expect(mockCarRepository.find).toHaveBeenCalledWith({
        where: { service: Service.Leasing },
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(baseCarDto);
      expect(result[0].service).toBe(Service.Leasing);
    });

    it('should throw an error when service is invalid', async () => {
      await expect(service.findAllByService('Rental')).rejects.toThrow('');
      expect(mockCarRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a car by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        price: '75000.00',
        service: Service.Leasing,
        images: ['/uploads/bmw.jpg'],
      };

      mockCarRepository.findOneOrFail.mockResolvedValue(mockCar);

      const result = await service.findOne(1);

      expect(mockCarRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toBeInstanceOf(baseCarDto);
      expect(result.id).toBe('1');
      expect(result.brand).toBe('BMW');
    });

    it('should throw an error when car is not found', async () => {
      mockCarRepository.findOneOrFail.mockRejectedValue(new Error(''));

      await expect(service.findOne(999)).rejects.toThrow('');
    });
  });

  describe('update', () => {
    it('should update a car by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        price: '75000.00',
        service: Service.Leasing,
        images: ['/uploads/old.jpg'],
      };
      const updateCarDto = {
        brand: 'Mercedes',
        images: ['/uploads/new.jpg'],
      };
      const updatedCar = {
        ...mockCar,
        brand: 'Mercedes',
        images: ['/uploads/old.jpg', '/uploads/new.jpg'],
      };

      mockCarRepository.findOneOrFail.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(updatedCar);

      const result = await service.update(1, updateCarDto);

      expect(mockCarRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCarRepository.save).toHaveBeenCalledWith(updatedCar);
      expect(result).toEqual(updatedCar);
    });

    it('should throw an error when car to update is not found', async () => {
      mockCarRepository.findOneOrFail.mockRejectedValue(new Error(''));

      await expect(service.update(999, { brand: 'Mercedes' })).rejects.toThrow(
        '',
      );
    });
  });

  describe('updateService', () => {
    it('should update a car service by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        price: '75000.00',
        service: Service.Leasing,
        images: [],
      };
      const updatedCar = { ...mockCar, service: Service.Sale };

      mockCarRepository.findOneOrFail.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(updatedCar);

      const result = await service.updateService(1, Service.Sale);

      expect(mockCarRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCarRepository.save).toHaveBeenCalledWith(updatedCar);
      expect(result).toEqual(updatedCar);
    });
  });

  describe('remove', () => {
    it('should remove a car by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        price: '75000.00',
        service: Service.Leasing,
        images: [],
      };

      mockCarRepository.findOneOrFail.mockResolvedValue(mockCar);
      mockCarRepository.remove.mockResolvedValue(mockCar);

      const result = await service.remove(1);

      expect(mockCarRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCarRepository.remove).toHaveBeenCalledWith(mockCar);
      expect(result).toEqual(mockCar);
    });

    it('should throw an error when car to remove is not found', async () => {
      mockCarRepository.findOneOrFail.mockRejectedValue(new Error(''));

      await expect(service.remove(999)).rejects.toThrow('');
    });
  });

  describe('deleteImage', () => {
    it('should delete an image from a car by id', async () => {
      const mockCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        price: '75000.00',
        service: Service.Leasing,
        images: ['/uploads/old.jpg', '/uploads/delete.jpg'],
      };
      const savedCar = { ...mockCar, images: ['/uploads/old.jpg'] };

      mockCarRepository.findOneOrFail.mockResolvedValue(mockCar);
      mockCarRepository.save.mockResolvedValue(savedCar);
      (unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await service.deleteImage(1, '/uploads/delete.jpg');

      expect(mockCarRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockCarRepository.save).toHaveBeenCalledWith(savedCar);
      expect(unlink).toHaveBeenCalledWith(
        join(process.cwd(), 'uploads', 'delete.jpg'),
      );
      expect(result).toEqual(savedCar);
    });

    it('should throw an error when image does not belong to the car', async () => {
      const mockCar = {
        id: 1,
        brand: 'BMW',
        model: 'X5',
        price: '75000.00',
        service: Service.Leasing,
        images: ['/uploads/old.jpg'],
      };

      mockCarRepository.findOneOrFail.mockResolvedValue(mockCar);

      await expect(
        service.deleteImage(1, '/uploads/missing.jpg'),
      ).rejects.toThrow('');
      expect(mockCarRepository.save).not.toHaveBeenCalled();
      expect(unlink).not.toHaveBeenCalled();
    });
  });
});
