import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClientfileDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsNumberString()
  carId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumberString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identityCard?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proofOfAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  insurance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  roadsideAssistance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  maintenance?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBooleanString()
  technicalControl?: string;
}
