import { ApiProperty } from '@nestjs/swagger';
import { BookingStatus } from '@prisma/client';

/** A booking as shown in the admin dashboard list. */
export class BookingListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'date-time' })
  startAt!: string;

  @ApiProperty({ format: 'date-time' })
  endAt!: string;

  @ApiProperty({ enum: BookingStatus })
  status!: BookingStatus;

  @ApiProperty()
  serviceName!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty()
  customerName!: string;

  @ApiProperty({ type: String, nullable: true })
  customerPhone!: string | null;

  @ApiProperty({ type: String, nullable: true })
  customerEmail!: string | null;

  @ApiProperty()
  priceCents!: number;
}
