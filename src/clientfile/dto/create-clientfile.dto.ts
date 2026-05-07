import {
  IsBooleanString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateClientfileDto {
  @IsNotEmpty()
  @IsNumberString()
  carId: string;

  @IsOptional()
  @IsNumberString()
  userId?: string;

  @IsOptional()
  @IsString()
  identityCard?: string;

  @IsOptional()
  @IsString()
  proofOfAddress?: string;

  @IsOptional()
  @IsBooleanString()
  insurance?: string;

  @IsOptional()
  @IsBooleanString()
  roadsideAssistance?: string;

  @IsOptional()
  @IsBooleanString()
  maintenance?: string;

  @IsOptional()
  @IsBooleanString()
  technicalControl?: string;
}
