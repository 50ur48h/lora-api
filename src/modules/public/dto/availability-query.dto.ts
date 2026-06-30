import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

export class AvailabilityQueryDto {
  @ApiProperty({
    example: '2026-07-01',
    description: 'Target day in the store timezone (YYYY-MM-DD).',
  })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD form',
  })
  date!: string;
}
