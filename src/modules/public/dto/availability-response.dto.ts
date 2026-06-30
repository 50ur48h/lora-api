import { ApiProperty } from '@nestjs/swagger';

export class SlotDto {
  @ApiProperty({
    format: 'date-time',
    description: 'UTC instant the appointment would start.',
  })
  startAt!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Staff member available for this slot.',
  })
  staffId!: string;
}

export class AvailabilityResponseDto {
  @ApiProperty({ example: '2026-07-01' })
  date!: string;

  @ApiProperty({ type: SlotDto, isArray: true })
  slots!: SlotDto[];
}
