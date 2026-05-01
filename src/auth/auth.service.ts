import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<string> {
    const user = await this.userService.findOneByEmail(loginDto.email);
    if (user == null) {
      throw new Error();
    }
    const result = await bcrypt.compare(loginDto.password, user.password);
    if (result == true) {
      const payload = { sub: user.id, email: user.email, role: user.role };
      return this.jwtService.signAsync(payload);
    }
    throw new Error('');
  }
}
