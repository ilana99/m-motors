import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { baseCarDto } from '../../cars/dto/base-car.dto';
import { BaseUserDto } from '../../user/dto/base-user.dto';
import { Status } from '../status.enum';

export class BaseClientfileDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ type: () => baseCarDto })
  car?: baseCarDto;

  @ApiPropertyOptional({ type: () => BaseUserDto })
  user?: BaseUserDto;

  @ApiProperty({ enum: Status })
  status: Status;

  @ApiProperty()
  dateSubmitted: Date;

  @ApiProperty()
  identityCard: string;

  @ApiProperty()
  proofOfAddress: string;

  @ApiPropertyOptional()
  insurance?: boolean;

  @ApiPropertyOptional()
  roadsideAssistance?: boolean;

  @ApiPropertyOptional()
  maintenance?: boolean;

  @ApiPropertyOptional()
  technicalControl?: boolean;
}
