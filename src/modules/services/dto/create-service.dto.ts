import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  storeId!: string;

  @ApiProperty({ example: 'Signature Facial' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 60, minimum: 1, description: 'Duration in minutes.' })
  @IsInt()
  @Min(1)
  durationMin!: number;

  @ApiProperty({ required: false, example: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  bufferMin?: number;

  @ApiProperty({ example: 15000, minimum: 0, description: 'Price in cents.' })
  @IsInt()
  @Min(0)
  priceCents!: number;

  @ApiProperty({ required: false, description: 'Defaults to active.' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
