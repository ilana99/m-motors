import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CarEntity } from './entities/car.entity';
import { Repository } from 'typeorm';
import { baseCarDto, carClientfileDto } from './dto/base-car.dto';
import { Service } from './service.enum';
import { SupabaseStorageService } from '../utilities/supabase-storage/supabase-storage.service';
import { ClientFileEntity } from '../clientfile/entities/clientfile.entity';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(CarEntity) private carRepository: Repository<CarEntity>,
    private readonly supabaseStorageService: SupabaseStorageService,
  ) {}

  private findStoredImage(images: string[], url: string): string | undefined {
    const storagePath = this.supabaseStorageService.getPathFromUrl(url);

    return images.find(
      (image) =>
        this.supabaseStorageService.getPathFromUrl(image) === storagePath,
    );
  }

  private getCarDto(car: CarEntity) {
    const carDTO = new baseCarDto();
    carDTO.id = car.id.toString();
    carDTO.brand = car.brand;
    carDTO.model = car.model;
    carDTO.price = car.price;
    carDTO.service = car.service;
    carDTO.images = car.images;
    carDTO.isAvailable = car.isAvailable;
    return carDTO;
  }

  private getClientfilePreviewDto(clientfile: ClientFileEntity) {
    const dto = new carClientfileDto();

    dto.id = clientfile.id.toString();
    dto.status = clientfile.status;
    dto.userId = clientfile.user.id.toString();
    dto.name = clientfile.user.name;
    dto.surname = clientfile.user.surname;

    return dto;
  }

  private async findCar(id: number) {
    const car = await this.carRepository.findOne({
      where: { id: id },
    });

    if (!car) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    return car;
  }

  async create(createCarDto: CreateCarDto) {
    if (!Object.values(Service).includes(createCarDto.service)) {
      throw new BadRequestException('Invalid service');
    }

    return await this.carRepository.save(createCarDto);
  }

  async findAll(): Promise<baseCarDto[]> {
    const cars = await this.carRepository.find();
    return cars.map((car) => this.getCarDto(car));
  }

  async findAllByService(service: Service): Promise<baseCarDto[]> {
    if (!Object.values(Service).includes(service)) {
      throw new BadRequestException('Invalid service');
    }

    const cars = await this.carRepository.find({
      where: { service },
    });

    return cars.map((car) => this.getCarDto(car));
  }

  async findAllByStatus(status: string): Promise<baseCarDto[]> {
    let isAvailable: boolean | undefined;

    if (status === 'available') {
      isAvailable = true;
    } else if (status === 'unavailable') {
      isAvailable = false;
    }

    if (isAvailable === undefined) {
      throw new BadRequestException('Invalid status');
    }

    const cars = await this.carRepository.find({
      where: { isAvailable: isAvailable },
    });
    return cars.map((car) => this.getCarDto(car));
  }

  async findOne(id: number) {
    const car = await this.findCar(id);
    return this.getCarDto(car);
  }

  async findOneForEmployees(id: number) {
    const car = await this.carRepository.findOne({
      where: { id },
      relations: ['clientFiles', 'clientFiles.user'],
    });

    if (!car) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    const carDto = this.getCarDto(car);
    carDto.clientFiles = car.clientFiles?.map((clientFile) =>
      this.getClientfilePreviewDto(clientFile),
    );

    return carDto;
  }

  async update(id: number, updateCarDto: UpdateCarDto) {
    const car = await this.findCar(id);
    if (
      updateCarDto.service &&
      updateCarDto.service !== car.service &&
      car.isAvailable === false
    ) {
      throw new BadRequestException('Car is not available');
    }
    const { images, ...otherFields } = updateCarDto;
    Object.assign(car, otherFields);
    if (images && images.length > 0) {
      car.images = [...(car.images ?? []), ...images];
    }
    return await this.carRepository.save(car);
  }

  async updateService(id: number, newService: Service) {
    if (!Object.values(Service).includes(newService)) {
      throw new BadRequestException('Invalid service');
    }
    const car = await this.findCar(id);
    if (newService !== car.service && car.isAvailable === false) {
      throw new BadRequestException('Car is not available');
    }
    car.service = newService;
    return await this.carRepository.save(car);
  }

  async remove(id: number) {
    const car = await this.findCar(id);
    return await this.carRepository.remove(car);
  }

  async deleteImage(id: number, url: string) {
    const car = await this.findCar(id);
    const image = this.findStoredImage(car.images ?? [], url);

    if (!image) {
      throw new NotFoundException('Could not find image');
    }

    car.images = car.images.filter((storedImage) => storedImage !== image);
    await this.carRepository.save(car);

    await this.supabaseStorageService.deleteFile(image);

    return car;
  }
}
