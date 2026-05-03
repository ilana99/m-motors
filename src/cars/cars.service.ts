import { Injectable } from '@nestjs/common';
import { CreateCarDto } from './dto/create-car.dto';
import { UpdateCarDto } from './dto/update-car.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { CarEntity } from './entities/car.entity';
import { Repository } from 'typeorm';
import { baseCarDto } from './dto/base-car.dto';
import { Service } from './service.enum';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';

@Injectable()
export class CarsService {
  constructor(
    @InjectRepository(CarEntity) private carRepository: Repository<CarEntity>,
  ) { }

  async create(createCarDto: CreateCarDto) {
    const service = createCarDto.service;
    let createCarWithService;
    if (service === 'Leasing') {
      createCarWithService = {
        ...createCarDto,
        service: Service.Leasing,
      };
    }
    if (service === 'Sale') {
      createCarWithService = {
        ...createCarDto,
        service: Service.Sale,
      };
    }
    return await this.carRepository.save(createCarWithService);
  }

  async findAll(): Promise<baseCarDto[]> {
    const cars = await this.carRepository.find();
    return cars.map((car) => {
      const carDTO = new baseCarDto();
      carDTO.id = car.id.toString();
      carDTO.brand = car.brand;
      carDTO.model = car.model;
      carDTO.price = car.price;
      carDTO.service = car.service;
      carDTO.images = car.images;
      return carDTO;
    });
  }

  async findAllByService(service: string): Promise<baseCarDto[]> {
    let serviceEnum: Service | undefined;

    if (service === 'Leasing') {
      serviceEnum = Service.Leasing;
    } else if (service === 'Sale') {
      serviceEnum = Service.Sale;
    }

    if (!serviceEnum) {
      throw new Error(``);
    }
    const cars = await this.carRepository.find({
      where: { service: serviceEnum },
    });
    return cars.map((car) => {
      const carDTO = new baseCarDto();
      carDTO.id = car.id.toString();
      carDTO.brand = car.brand;
      carDTO.model = car.model;
      carDTO.price = car.price;
      carDTO.service = car.service;
      carDTO.images = car.images;
      return carDTO;
    });
  }

  async findOne(id: number) {
    const car = await this.carRepository.findOneOrFail({
      where: { id: id },
    });
    const carDTO = new baseCarDto();
    carDTO.id = car.id.toString();
    carDTO.brand = car.brand;
    carDTO.model = car.model;
    carDTO.price = car.price;
    carDTO.service = car.service;
    carDTO.images = car.images;
    return carDTO;
  }

  async update(id: number, updateCarDto: UpdateCarDto) {
    const car = await this.carRepository.findOneOrFail({ where: { id } });
    const { images, ...otherFields } = updateCarDto;
    Object.assign(car, otherFields);
    if (images && images.length > 0) {
      car.images = [...(car.images ?? []), ...images];
    }
    return await this.carRepository.save(car);
  }

  async updateService(id: number, newService: Service) {
    const car = await this.carRepository.findOneOrFail({
      where: { id: id },
    });
    car.service = newService;
    return await this.carRepository.save(car);
  }

  async remove(id: number) {
    const car = await this.carRepository.findOneOrFail({
      where: { id: id },
    });
    return await this.carRepository.remove(car);
  }

  async deleteImage(id: number, url: string) {
    const car = await this.carRepository.findOneOrFail({ where: { id } });
    const images = car.images ?? [];

    if (!images.includes(url)) {
      throw new Error('');
    }

    car.images = images.filter((image) => image !== url);
    await this.carRepository.save(car);

    const filename = basename(url);
    const filePath = join(process.cwd(), 'uploads', filename);

    await unlink(filePath);

    return car;
  }
}
