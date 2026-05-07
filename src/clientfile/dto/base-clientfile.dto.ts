import { baseCarDto } from '../../cars/dto/base-car.dto';
import { BaseUserDto } from '../../user/dto/base-user.dto';
import { Status } from '../status.enum';

export class BaseClientfileDto {
  id: string;
  car?: baseCarDto;
  user?: BaseUserDto;
  status: Status;
  dateSubmitted: Date;
  identityCard: string;
  proofOfAddress: string;
  insurance?: boolean;
  roadsideAssistance?: boolean;
  maintenance?: boolean;
  technicalControl?: boolean;
}
