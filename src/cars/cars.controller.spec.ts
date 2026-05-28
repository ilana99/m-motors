import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { Service } from './service.enum';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SupabaseStorageService } from '../utilities/supabase-storage/supabase-storage.service';

type MockCarsService = {
  create: jest.Mock;
  findAll: jest.Mock;
  findAllByService: jest.Mock;
  findAllByStatus: jest.Mock;
  findOne: jest.Mock;
  findOneForEmployees: jest.Mock;
  update: jest.Mock;
  updateService: jest.Mock;
  remove: jest.Mock;
  deleteImage: jest.Mock;
};

type MockSupabaseStorageService = {
  uploadFile: jest.Mock;
};

describe('CarsController', () => {
  let controller: CarsController;
  let mockCarsService: MockCarsService;
  let mockSupabaseStorageService: MockSupabaseStorageService;

  beforeEach(async () => {
    mockCarsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findAllByService: jest.fn(),
      findAllByStatus: jest.fn(),
      findOne: jest.fn(),
      findOneForEmployees: jest.fn(),
      update: jest.fn(),
      updateService: jest.fn(),
      remove: jest.fn(),
      deleteImage: jest.fn(),
    };
    mockSupabaseStorageService = {
      uploadFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CarsController],
      providers: [
        {
          provide: CarsService,
          useValue: mockCarsService,
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

    controller = module.get<CarsController>(CarsController);
  });

  it('should create a car', async () => {
    const createCarDto = {
      brand: 'Genesis',
      model: 'GV80',
      price: '75000.00',
      service: Service.Leasing,
    };
    const images = [
      {
        originalname: 'genesis-gv80.jpg',
        buffer: Buffer.from('genesis'),
        mimetype: 'image/jpeg',
      },
      {
        originalname: 'genesis-gv80-2.jpg',
        buffer: Buffer.from('gv80'),
        mimetype: 'image/jpeg',
      },
    ] as unknown as Array<Express.Multer.File>;
    const mockCar = {
      id: 1,
      ...createCarDto,
      images: [
        'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80.jpg',
        'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80-2.jpg',
      ],
    };

    mockSupabaseStorageService.uploadFile
      .mockResolvedValueOnce(mockCar.images[0])
      .mockResolvedValueOnce(mockCar.images[1]);
    mockCarsService.create.mockResolvedValue(mockCar);

    const result: unknown = await controller.create(createCarDto, images);

    expect(mockCarsService.create).toHaveBeenCalledWith({
      ...createCarDto,
      images: mockCar.images,
    });
    expect(result).toEqual(mockCar);
  });

  it('should create a car without images', async () => {
    const createCarDto = {
      brand: 'Genesis',
      model: 'GV80',
      price: '75000.00',
      service: Service.Leasing,
    };
    const mockCar = {
      id: 1,
      ...createCarDto,
    };

    mockCarsService.create.mockResolvedValue(mockCar);

    const result = await controller.create(createCarDto, []);

    expect(mockSupabaseStorageService.uploadFile).not.toHaveBeenCalled();
    expect(mockCarsService.create).toHaveBeenCalledWith(createCarDto);
    expect(result).toEqual(mockCar);
  });

  it('should not create a car when image buffer is missing', async () => {
    const result = controller.create(
      {
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
      },
      [
        {
          originalname: 'genesis-gv80.jpg',
          mimetype: 'image/jpeg',
        },
      ] as unknown as Array<Express.Multer.File>,
    );

    await expect(result).rejects.toThrow('Image file buffer is missing');
    expect(mockSupabaseStorageService.uploadFile).not.toHaveBeenCalled();
    expect(mockCarsService.create).not.toHaveBeenCalled();
  });

  it('should not create a car and throw error', async () => {
    mockCarsService.create.mockRejectedValue(
      new BadRequestException('Invalid service'),
    );

    const result = controller.create(
      {
        brand: 'Genesis',
        model: 'GV80',
        price: '75000.00',
        service: Service.Leasing,
      },
      [] as Array<Express.Multer.File>,
    );

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 400);
  });

  it('should return all cars', async () => {
    const mockCars = [{ id: 1, brand: 'Genesis', model: 'GV80' }];
    mockCarsService.findAll.mockResolvedValue(mockCars);

    const result = await controller.findAll();

    expect(mockCarsService.findAll).toHaveBeenCalled();
    expect(result).toEqual(mockCars);
  });

  it('should return relative image URLs with API URL', async () => {
    const apiUrl = process.env.API_URL;
    process.env.API_URL = 'https://api.example.com';
    const mockCars = [
      {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        images: ['cars/genesis-gv80.jpg'],
      },
    ];
    mockCarsService.findAll.mockResolvedValue(mockCars);

    const result = await controller.findAll();

    expect(result).toEqual([
      {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        images: ['https://api.example.com/cars/genesis-gv80.jpg'],
      },
    ]);
    process.env.API_URL = apiUrl;
  });

  it('should return Supabase image URLs unchanged', async () => {
    const imageUrl =
      'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80.jpg';
    const mockCars = [
      {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        images: [imageUrl],
      },
    ];
    mockCarsService.findAll.mockResolvedValue(mockCars);

    const result = await controller.findAll();

    expect(result).toEqual([
      {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        images: [imageUrl],
      },
    ]);
  });

  it('should not return all cars and throw error', async () => {
    mockCarsService.findAll.mockRejectedValue(
      new NotFoundException('No cars found'),
    );

    const result = controller.findAll();

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should return all cars by service', async () => {
    const mockCars = [
      { id: 1, brand: 'Genesis', model: 'GV80', service: Service.Leasing },
    ];
    mockCarsService.findAllByService.mockResolvedValue(mockCars);

    const result = await controller.findAllByService(Service.Leasing);

    expect(mockCarsService.findAllByService).toHaveBeenCalledWith(
      Service.Leasing,
    );
    expect(result).toEqual(mockCars);
  });

  it('should not return cars by service and throw error', async () => {
    mockCarsService.findAllByService.mockRejectedValue(
      new BadRequestException('Invalid service'),
    );

    const result = controller.findAllByService('Rental' as Service);

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 400);
  });

  it('should return all cars by status', async () => {
    const mockCars = [
      {
        id: 1,
        brand: 'Genesis',
        model: 'GV80',
        isAvailable: true,
      },
    ];
    mockCarsService.findAllByStatus.mockResolvedValue(mockCars);

    const result = await controller.findAllByStatus('available');

    expect(mockCarsService.findAllByStatus).toHaveBeenCalledWith('available');
    expect(result).toEqual(mockCars);
  });

  it('should not return cars by status and throw error', async () => {
    mockCarsService.findAllByStatus.mockRejectedValue(
      new BadRequestException('Invalid status'),
    );

    const result = controller.findAllByStatus('archived');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 400);
  });

  it('should find one car by id', async () => {
    const mockCar = { id: 1, brand: 'Genesis', model: 'GV80' };
    mockCarsService.findOne.mockResolvedValue(mockCar);

    const result = await controller.findOne(1);

    expect(mockCarsService.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockCar);
  });

  it('should not find one car by id and throw error', async () => {
    mockCarsService.findOne.mockRejectedValue(
      new NotFoundException('Car with id 1 not found'),
    );

    const result = controller.findOne(1);

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should find one car with clientfiles by id', async () => {
    const mockCar = {
      id: 1,
      brand: 'Genesis',
      model: 'GV80',
      clientFiles: [{ id: '3' }],
    };
    mockCarsService.findOneForEmployees.mockResolvedValue(mockCar);

    const result = await controller.findOneWithClientfiles(1);

    expect(mockCarsService.findOneForEmployees).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockCar);
  });

  it('should update one car by id', async () => {
    const updateCarDto = { brand: 'Genesis', model: 'GV80' };
    const images = [
      {
        originalname: 'genesis-gv80.jpg',
        buffer: Buffer.from('genesis'),
        mimetype: 'image/jpeg',
      },
    ] as unknown as Array<Express.Multer.File>;
    const mockCar = {
      id: 1,
      brand: 'Genesis',
      model: 'GV80',
      images: [
        'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80.jpg',
      ],
    };

    mockSupabaseStorageService.uploadFile.mockResolvedValue(mockCar.images[0]);
    mockCarsService.update.mockResolvedValue(mockCar);

    const result = await controller.update(1, updateCarDto, images);

    expect(mockCarsService.update).toHaveBeenCalledWith(1, {
      ...updateCarDto,
      images: mockCar.images,
    });
    expect(result).toEqual(mockCar);
  });

  it('should update one car without images', async () => {
    const updateCarDto = { brand: 'Genesis', model: 'GV80' };
    const mockCar = {
      id: 1,
      brand: 'Genesis',
      model: 'GV80',
    };

    mockCarsService.update.mockResolvedValue(mockCar);

    const result = await controller.update(1, updateCarDto, []);

    expect(mockSupabaseStorageService.uploadFile).not.toHaveBeenCalled();
    expect(mockCarsService.update).toHaveBeenCalledWith(1, updateCarDto);
    expect(result).toEqual(mockCar);
  });

  it('should not update a car when image buffer is missing', async () => {
    const result = controller.update(
      1,
      { brand: 'Genesis' },
      [
        {
          originalname: 'genesis-gv80.jpg',
          mimetype: 'image/jpeg',
        },
      ] as unknown as Array<Express.Multer.File>,
    );

    await expect(result).rejects.toThrow('Image file buffer is missing');
    expect(mockCarsService.update).not.toHaveBeenCalled();
  });

  it('should update one car service by id', async () => {
    const mockCar = {
      id: 1,
      brand: 'Genesis',
      model: 'GV80',
      service: Service.Sale,
    };
    mockCarsService.updateService.mockResolvedValue(mockCar);

    const result = await controller.updateService(1, Service.Sale);

    expect(mockCarsService.updateService).toHaveBeenCalledWith(1, Service.Sale);
    expect(result).toEqual(mockCar);
  });

  it('should remove one car by id', async () => {
    const result = await controller.remove(1);

    expect(mockCarsService.remove).toHaveBeenCalledWith(1);
    expect(result).toBeUndefined();
  });

  it('should not remove one car by id and throw error', async () => {
    mockCarsService.remove.mockRejectedValue(
      new NotFoundException('Car with id 1 not found'),
    );

    const result = controller.remove(1);

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });

  it('should delete one car image by id', async () => {
    const mockCar = {
      id: 1,
      images: [
        'https://example.supabase.co/storage/v1/object/public/images/cars/genesis-gv80.jpg',
      ],
    };
    mockCarsService.deleteImage.mockResolvedValue(mockCar);

    const result = await controller.deleteImage(1, 'cars/genesis-gv80.jpg');

    expect(mockCarsService.deleteImage).toHaveBeenCalledWith(
      1,
      'cars/genesis-gv80.jpg',
    );
    expect(result).toEqual(mockCar);
  });

  it('should not delete an image without url and throw error', async () => {
    const result = controller.deleteImage(1, '');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 400);
  });

  it('should not delete one car image by id and throw error', async () => {
    mockCarsService.deleteImage.mockRejectedValue(
      new NotFoundException('Could not find image'),
    );

    const result = controller.deleteImage(1, 'cars/genesis-gv80.jpg');

    await expect(result).rejects.toThrow(HttpException);
    await expect(result).rejects.toHaveProperty('status', 404);
  });
});
