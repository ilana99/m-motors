import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';

export class UpdateClientfileDto {
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
