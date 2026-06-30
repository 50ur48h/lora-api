import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class BookingCustomerDto {
  @ApiProperty({ example: 'Nadia Tan' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '+60123456789' })
  @IsString()
  @MinLength(5)
  @MaxLength(32)
  phone!: string;

  @ApiProperty({ required: false, example: 'nadia@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  staffId!: string;

  @ApiProperty({
    format: 'date-time',
    description: 'Chosen slot start (ISO 8601, UTC).',
  })
  @IsISO8601()
  startAt!: string;

  @ApiProperty({ type: BookingCustomerDto })
  @ValidateNested()
  @Type(() => BookingCustomerDto)
  customer!: BookingCustomerDto;
}
