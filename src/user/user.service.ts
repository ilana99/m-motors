import { Injectable } from '@nestjs/common';
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
  ) {}

  async signUp(createUserDto: CreateUserDto) {
    const saltOrRounds = 10;
    const hash = await bcrypt.hash(createUserDto.password, saltOrRounds);
    const createUserDtoWithHash = { ...createUserDto, password: hash };
    await this.userRepository.save(createUserDtoWithHash);
  }

  async findAll(): Promise<BaseUserDto[]> {
    const users = await this.userRepository.find();
    return users.map((user) => {
      const userDTO = new BaseUserDto();
      userDTO.id = user.id.toString();
      userDTO.email = user.email;
      userDTO.name = user.name;
      userDTO.surname = user.surname;
      userDTO.birthday = user.birthday;
      return userDTO;
    });
  }

  async findOne(id: number): Promise<BaseUserDto> {
    const user = await this.userRepository.findOneOrFail({
      where: { id: id },
    });
    const userDTO = new BaseUserDto();
    userDTO.id = user.id.toString();
    userDTO.email = user.email;
    userDTO.name = user.name;
    userDTO.surname = user.surname;
    userDTO.birthday = user.birthday;
    return userDTO;
  }

  async findOneByEmail(email: string): Promise<UserEntity> {
    return await this.userRepository.findOneOrFail({
      where: { email: email },
    });
  }

  async remove(id: number) {
    const user = await this.userRepository.findOneOrFail({
      where: { id: id },
    });
    return await this.userRepository.remove(user);
  }
}
