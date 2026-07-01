import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

/** Public booking-status payload returned by the tracking endpoint. */
export class BookingTrackResponseDto {
  @ApiProperty()
  reference!: string;

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

  @ApiProperty()
  storeName!: string;

  @ApiProperty()
  storeSlug!: string;

  @ApiProperty({ description: 'IANA timezone of the store.' })
  timezone!: string;

  @ApiProperty()
  customerName!: string;

  @ApiProperty({ description: 'Price in cents (MYR).' })
  priceCents!: number;
}
