import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateClientfileDto } from './dto/create-clientfile.dto';
import { UpdateClientfileDto } from './dto/update-clientfile.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { ClientFileEntity } from './entities/clientfile.entity';
import { Repository } from 'typeorm';
import { Status } from './status.enum';
import { BaseUserDto } from '../user/dto/base-user.dto';
import { baseCarDto } from '../cars/dto/base-car.dto';
import { BaseClientfileDto } from './dto/base-clientfile.dto';
import { UserRole } from '../user/role.enum';
import { CarEntity } from '../cars/entities/car.entity';
import { Service } from '../cars/service.enum';

@Injectable()
export class ClientfileService {
  constructor(
    @InjectRepository(ClientFileEntity)
    private clientfileRepository: Repository<ClientFileEntity>,
    @InjectRepository(CarEntity)
    private carRepository: Repository<CarEntity>,
  ) { }

  private toBoolean(value: boolean | string | undefined) {
    return value === true || value === 'true';
  }

  private hasTrueOption(
    clientfileDto: CreateClientfileDto | UpdateClientfileDto,
  ) {
    return (
      this.toBoolean(clientfileDto.insurance) ||
      this.toBoolean(clientfileDto.roadsideAssistance) ||
      this.toBoolean(clientfileDto.maintenance) ||
      this.toBoolean(clientfileDto.technicalControl)
    );
  }

  private hideOptionsForSale(clientfile: ClientFileEntity, car: CarEntity) {
    if (car.service === Service.Leasing) {
      return clientfile;
    }

    const {
      insurance,
      roadsideAssistance,
      maintenance,
      technicalControl,
      ...clientfileWithoutOptions
    } = clientfile;

    return clientfileWithoutOptions;
  }

  private getClientfileData(
    clientfileDto: CreateClientfileDto,
    car: CarEntity,
  ) {
    const isLeasing = car.service === Service.Leasing;

    if (
      isLeasing &&
      (clientfileDto.insurance === undefined ||
        clientfileDto.roadsideAssistance === undefined ||
        clientfileDto.maintenance === undefined ||
        clientfileDto.technicalControl === undefined)
    ) {
      throw new BadRequestException('Leasing options are required');
    }

    if (!isLeasing && this.hasTrueOption(clientfileDto)) {
      throw new BadRequestException(
        'Options are only available for leasing cars',
      );
    }

    return {
      ...clientfileDto,
      carId: Number(clientfileDto.carId),
      userId: Number(clientfileDto.userId),
      insurance: isLeasing && this.toBoolean(clientfileDto.insurance),
      roadsideAssistance:
        isLeasing && this.toBoolean(clientfileDto.roadsideAssistance),
      maintenance: isLeasing && this.toBoolean(clientfileDto.maintenance),
      technicalControl:
        isLeasing && this.toBoolean(clientfileDto.technicalControl),
    };
  }

  private getClientfileUpdateData(
    clientfileDto: UpdateClientfileDto,
    car: CarEntity,
  ) {
    const clientfileData: Partial<ClientFileEntity> = {};

    if (clientfileDto.identityCard !== undefined) {
      clientfileData.identityCard = clientfileDto.identityCard;
    }
    if (clientfileDto.proofOfAddress !== undefined) {
      clientfileData.proofOfAddress = clientfileDto.proofOfAddress;
    }

    if (car.service !== Service.Leasing) {
      if (this.hasTrueOption(clientfileDto)) {
        throw new BadRequestException(
          'Options are only available for leasing cars',
        );
      }
      clientfileData.insurance = false;
      clientfileData.roadsideAssistance = false;
      clientfileData.maintenance = false;
      clientfileData.technicalControl = false;
      return clientfileData;
    }

    if (clientfileDto.insurance !== undefined) {
      clientfileData.insurance = this.toBoolean(clientfileDto.insurance);
    }
    if (clientfileDto.roadsideAssistance !== undefined) {
      clientfileData.roadsideAssistance = this.toBoolean(
        clientfileDto.roadsideAssistance,
      );
    }
    if (clientfileDto.maintenance !== undefined) {
      clientfileData.maintenance = this.toBoolean(clientfileDto.maintenance);
    }
    if (clientfileDto.technicalControl !== undefined) {
      clientfileData.technicalControl = this.toBoolean(
        clientfileDto.technicalControl,
      );
    }

    return clientfileData;
  }

  private getUserDto(clientfile: ClientFileEntity) {
    const userDto = new BaseUserDto();
    userDto.id = clientfile.user.id.toString();
    userDto.email = clientfile.user.email;
    userDto.name = clientfile.user.name;
    userDto.surname = clientfile.user.surname;
    userDto.birthday = clientfile.user.birthday;
    return userDto;
  }

  private getCarDto(clientfile: ClientFileEntity) {
    const carDto = new baseCarDto();
    carDto.id = clientfile.car.id.toString();
    carDto.brand = clientfile.car.brand;
    carDto.model = clientfile.car.model;
    carDto.price = clientfile.car.price;
    carDto.service = clientfile.car.service;
    carDto.images = clientfile.car.images;
    carDto.isAvailable = clientfile.car.isAvailable;
    return carDto;
  }

  private getClientfileDto(clientfile: ClientFileEntity) {
    const clientfileDto = new BaseClientfileDto();
    clientfileDto.id = clientfile.id.toString();
    clientfileDto.status = clientfile.status;
    clientfileDto.dateSubmitted = clientfile.dateSubmitted;
    clientfileDto.identityCard = clientfile.identityCard;
    clientfileDto.proofOfAddress = clientfile.proofOfAddress;
    if (clientfile.car?.service === Service.Leasing) {
      clientfileDto.insurance = clientfile.insurance;
      clientfileDto.roadsideAssistance = clientfile.roadsideAssistance;
      clientfileDto.maintenance = clientfile.maintenance;
      clientfileDto.technicalControl = clientfile.technicalControl;
    }
    return clientfileDto;
  }

  private async findClientfile(id: number, relations: string[] = []) {
    const clientfile = await this.clientfileRepository.findOne({
      where: { id: id },
      relations,
    });

    if (!clientfile) {
      throw new NotFoundException(`Clientfile with id ${id} not found`);
    }

    return clientfile;
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

  public async findPendingSubmission(
    userId: number,
  ): Promise<ClientFileEntity | null> {
    return await this.clientfileRepository.findOne({
      where: {
        userId: userId,
        status: Status.Pending,
      },
    });
  }

  async checkCreate(userId: number, carId: number) {
    if (await this.findPendingSubmission(userId)) {
      throw new BadRequestException('User already has a pending clientfile');
    }

    const car = await this.findCar(carId);

    if (!car.isAvailable) {
      throw new BadRequestException('Car is not available');
    }

    return car;
  }

  async checkUpdate(role: UserRole, userId: number, id: number) {
    const clientfile = await this.findClientfile(id);

    if (clientfile.status === Status.Canceled) {
      throw new BadRequestException('Cannot update canceled client file');
    }
    if (clientfile.status === Status.Rejected) {
      throw new BadRequestException(
        'Cannot update already rejected client file',
      );
    }
    if (clientfile.status === Status.Accepted) {
      throw new BadRequestException(
        'Cannot update already accepted client file',
      );
    }
    if (role === UserRole.User && clientfile.userId !== userId) {
      throw new ForbiddenException('User cannot update another user file');
    }
  }

  async create(createClientfileDto: CreateClientfileDto) {
    const car = await this.checkCreate(
      Number(createClientfileDto.userId),
      Number(createClientfileDto.carId),
    );

    const clientfile = this.clientfileRepository.create(
      this.getClientfileData(createClientfileDto, car),
    );
    const savedClientfile = await this.clientfileRepository.save(clientfile);
    return this.hideOptionsForSale(savedClientfile, car);
  }

  async findAll(role: UserRole, userId: number) {
    const clientfiles = await this.clientfileRepository.find({
      where: role === UserRole.User ? { userId: userId } : {},
      relations: ['user', 'car'],
    });

    return clientfiles.map((clientfile) => {
      const clientfileDto = this.getClientfileDto(clientfile);
      clientfileDto.car = this.getCarDto(clientfile);

      if (role === UserRole.Employee) {
        clientfileDto.user = this.getUserDto(clientfile);
      }

      return clientfileDto;
    });
  }

  async findAllByStatus(status: Status) {
    if (!Object.values(Status).includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const clientfiles = await this.clientfileRepository.find({
      where: { status: status },
      relations: ['user', 'car'],
    });

    return clientfiles.map((clientfile) => {
      const clientfileDto = this.getClientfileDto(clientfile);
      clientfileDto.user = this.getUserDto(clientfile);
      clientfileDto.car = this.getCarDto(clientfile);
      return clientfileDto;
    });
  }

  async findOne(role: UserRole, userId: number, id?: number) {
    let clientfile: ClientFileEntity;

    if (id !== undefined) {
      clientfile = await this.findClientfile(id, ['user', 'car']);
    } else {
      const userClientfile = await this.clientfileRepository.findOne({
        where: { userId: userId },
        relations: ['car'],
      });

      if (!userClientfile) {
        throw new NotFoundException('Clientfile not found');
      }

      clientfile = userClientfile;
    }

    if (role === UserRole.User && clientfile.userId !== userId) {
      throw new ForbiddenException('User cannot access other user file');
    }

    const clientfileDto = this.getClientfileDto(clientfile);
    clientfileDto.car = this.getCarDto(clientfile);

    if (role === UserRole.Employee) {
      clientfileDto.user = this.getUserDto(clientfile);
    }

    return clientfileDto;
  }

  async update(
    role: UserRole,
    userId: number,
    id: number,
    updateClientfileDto: UpdateClientfileDto,
  ) {
    await this.checkUpdate(role, userId, id);

    const clientfile = await this.findClientfile(id, ['car']);

    const updatedClientfile = {
      ...clientfile,
      ...this.getClientfileUpdateData(updateClientfileDto, clientfile.car),
    };

    await this.clientfileRepository.save(updatedClientfile);

    const savedClientfile = await this.findClientfile(id, ['user', 'car']);

    const clientfileDto = this.getClientfileDto(savedClientfile);
    clientfileDto.car = this.getCarDto(savedClientfile);

    if (role === UserRole.Employee) {
      clientfileDto.user = this.getUserDto(savedClientfile);
    }

    return clientfileDto;
  }

  async updateStatus(id: number, status: Status) {
    if (!Object.values(Status).includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const clientfile = await this.findClientfile(id, ['user', 'car']);

    if (clientfile.status != Status.Pending) {
      throw new BadRequestException(
        'Only pending status client files can be updated',
      );
    }

    const car = clientfile.car ?? (await this.findCar(clientfile.carId));
    if (!car.isAvailable) {
      throw new BadRequestException('Car is not available');
    }

    clientfile.status = status;

    if (clientfile.status == Status.Accepted) {
      car.isAvailable = false;
      await this.carRepository.save(car);
    }
    const savedClientfile = await this.clientfileRepository.save(clientfile);
    const clientfileDto = this.getClientfileDto(savedClientfile);
    clientfileDto.user = this.getUserDto(savedClientfile);
    clientfileDto.car = this.getCarDto(savedClientfile);
    return clientfileDto;
  }

  async cancelSubmission(userId: number, role: UserRole) {
    const clientfile = await this.findPendingSubmission(userId);

    if (!clientfile) {
      throw new BadRequestException('No pending client file');
    }

    if (userId != clientfile.userId) {
      throw new ForbiddenException('User cannot cancel anoter user submission');
    }

    clientfile.status = Status.Canceled;
    await this.clientfileRepository.save(clientfile);

    return this.findAll(role, userId);
  }

  async remove(id: number) {
    const clientfile = await this.findClientfile(id);
    return await this.clientfileRepository.remove(clientfile);
  }
}
