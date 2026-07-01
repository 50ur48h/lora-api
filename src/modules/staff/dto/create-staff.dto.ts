import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ example: 'Aisha Rahman' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ required: false, example: 'Senior Therapist' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  photoUrl?: string;

  @ApiProperty({ required: false, description: 'Defaults to active.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
