import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { BaseUserDto } from './dto/base-user.dto';
import { UserEntity } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) { }

  private getUserDto(user: UserEntity) {
    const userDTO = new BaseUserDto();
    userDTO.id = user.id.toString();
    userDTO.email = user.email;
    userDTO.name = user.name;
    userDTO.surname = user.surname;
    userDTO.birthday = user.birthday;
    return userDTO;
  }

  private async findUser(id: number) {
    const user = await this.userRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  async signUp(createUserDto: CreateUserDto): Promise<void> {
    try {
      const saltOrRounds = 10;
      const hash = await bcrypt.hash(createUserDto.password, saltOrRounds);
      const createUserDtoWithHash = { ...createUserDto, password: hash };
      await this.userRepository.save(createUserDtoWithHash);
    } catch {
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll(): Promise<BaseUserDto[]> {
    const users = await this.userRepository.find();
    return users.map((user) => this.getUserDto(user));
  }

  async findOne(id: number): Promise<BaseUserDto> {
    const user = await this.findUser(id);
    return this.getUserDto(user);
  }

  async findOneByEmail(email: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async remove(id: number): Promise<UserEntity> {
    const user = await this.findUser(id);
    return await this.userRepository.remove(user);
  }
}
