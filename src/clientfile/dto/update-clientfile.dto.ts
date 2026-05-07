import {
    IsOptional,
    IsString,
    IsBooleanString,
} from 'class-validator';

export class UpdateClientfileDto {
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
