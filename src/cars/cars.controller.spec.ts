import { Test, TestingModule } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { Service } from './service.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

type MockCarsService = {
  create: jest.Mock;
  findAll: jest.Mock;
  findAllByService: jest.Mock;
  findOne: jest.Mock;
  update: jest.Mock;
  updateService: jest.Mock;
  remove: jest.Mock;
  deleteImage: jest.Mock;
};

describe('CarsController', () => {
  let controller: CarsController;
  let mockCarsService: MockCarsService;

  beforeEach(async () => {
    mockCarsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllByService: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      updateService: jest.fn(),
      remove: jest.fn(),
      deleteImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarsController],
      providers: [
        {
          provide: CarsService,
          useValue: mockCarsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<CarsController>(CarsController);
  });

  it('should create a car', async () => {
    const createCarDto = {
      brand: 'BMW',
      model: 'X5',
      price: '75000.00',
      service: Service.Leasing,
    };
    const images = [
      { filename: 'bmw.jpg' },
      { filename: 'bmw-2.jpg' },
    ] as unknown as Array<Express.Multer.File>;
    const mockCar = {
      id: 1,
      ...createCarDto,
      images: ['/uploads/bmw.jpg', '/uploads/bmw-2.jpg'],
    };

    mockCarsService.create.mockResolvedValue(mockCar);

    const result: unknown = await controller.create(createCarDto, images);

    expect(mockCarsService.create).toHaveBeenCalledWith({
      ...createCarDto,
      images: ['/uploads/bmw.jpg', '/uploads/bmw-2.jpg'],
    });
    expect(result).toEqual(mockCar);
  });

  it('should not create a car and throw error', async () => {
    mockCarsService.create.mockRejectedValue(new Error(''));

    const result = controller.create(
      {
        brand: 'BMW',
        model: 'X5',
        price: '75000.00',
        service: Service.Leasing,
      },
      [] as Array<Express.Multer.File>,
    );

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 400);
  });

  it('should return all cars', async () => {
    const mockCars = [
      { id: 1, brand: 'BMW' },
      { id: 2, brand: 'Audi' },
    ];
    mockCarsService.findAll.mockResolvedValue(mockCars);

    const result = await controller.findAll();

    expect(mockCarsService.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockCars);
  });

  it('should not return all cars and throw error', async () => {
    mockCarsService.findAll.mockRejectedValue(new Error(''));

    const result = controller.findAll();

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should return all cars by service', async () => {
    const mockCars = [{ id: 1, brand: 'BMW', service: Service.Leasing }];
    mockCarsService.findAllByService.mockResolvedValue(mockCars);

    const result = await controller.findAllByService('Leasing');

    expect(mockCarsService.findAllByService).toHaveBeenCalledWith('Leasing');
    expect(result).toEqual(mockCars);
  });

  it('should not return cars by service and throw error', async () => {
    mockCarsService.findAllByService.mockRejectedValue(new Error(''));

    const result = controller.findAllByService('Rental');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should find one car by id', async () => {
    const mockCar = { id: 1, brand: 'BMW' };
    mockCarsService.findOne.mockResolvedValue(mockCar);

    const result = await controller.findOne('1');

    expect(mockCarsService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockCar);
  });

  it('should not find one car by id and throw error', async () => {
    mockCarsService.findOne.mockRejectedValue(new Error(''));

    const result = controller.findOne('1');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should update one car by id', async () => {
    const updateCarDto = { brand: 'Mercedes' };
    const images = [
      { filename: 'mercedes.jpg' },
    ] as unknown as Array<Express.Multer.File>;
    const mockCar = {
      id: 1,
      brand: 'Mercedes',
      images: ['/uploads/mercedes.jpg'],
    };

    mockCarsService.update.mockResolvedValue(mockCar);

    const result = await controller.update('1', updateCarDto, images);

    expect(mockCarsService.update).toHaveBeenCalledWith(1, {
      ...updateCarDto,
      images: ['/uploads/mercedes.jpg'],
    });
    expect(result).toEqual(mockCar);
  });

  it('should update one car service by id', async () => {
    const mockCar = { id: 1, brand: 'BMW', service: Service.Sale };
    mockCarsService.updateService.mockResolvedValue(mockCar);

    const result = await controller.updateService('1', Service.Sale);

    expect(mockCarsService.updateService).toHaveBeenCalledWith(1, Service.Sale);
    expect(result).toEqual(mockCar);
  });

  it('should remove one car by id', async () => {
    const result = await controller.remove('1');

    expect(mockCarsService.remove).toHaveBeenCalledWith(1);
    expect(result).toBeUndefined();
  });

  it('should not remove one car by id and throw error', async () => {
    mockCarsService.remove.mockRejectedValue(new Error(''));

    const result = controller.remove('1');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should delete one car image by id', async () => {
    const mockCar = { id: 1, images: ['/uploads/old.jpg'] };
    mockCarsService.deleteImage.mockResolvedValue(mockCar);

    const result = await controller.deleteImage('1', '/uploads/delete.jpg');

    expect(mockCarsService.deleteImage).toHaveBeenCalledWith(
      1,
      '/uploads/delete.jpg',
    );
    expect(result).toEqual(mockCar);
  });

  it('should not delete an image without url and throw error', async () => {
    const result = controller.deleteImage('1', '');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 400);
  });

  it('should not delete one car image by id and throw error', async () => {
    mockCarsService.deleteImage.mockRejectedValue(new Error(''));

    const result = controller.deleteImage('1', '/uploads/delete.jpg');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });
});
