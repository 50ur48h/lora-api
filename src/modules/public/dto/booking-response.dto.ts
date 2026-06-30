import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

export class BookingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty({ format: 'date-time' })
  startAt!: string;

  @ApiProperty({ format: 'date-time' })
  endAt!: string;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty({ description: 'Price in cents (MYR).' })
  priceCents!: number;
}
