import { ApiProperty } from '@nestjs/swagger';

export class BaseUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  surname: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  birthday: Date;
}
