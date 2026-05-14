import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Status } from '../../clientfile/status.enum';

export class baseCarDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  brand: string;

  @ApiProperty()
  model: string;

  @ApiProperty()
  price: string;

  @ApiPropertyOptional()
  service?: string;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  isAvailable: boolean;

  @ApiPropertyOptional({ type: () => [carClientfileDto] })
  clientFiles?: carClientfileDto[];
}

export class carClientfileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  surname: string;

  @ApiProperty({ enum: Status })
  status: Status;
}
