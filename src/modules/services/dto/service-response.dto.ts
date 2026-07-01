import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  storeId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Duration in minutes.' })
  durationMin!: number;

  @ApiProperty({ description: 'Buffer/cleanup minutes after the service.' })
  bufferMin!: number;

  @ApiProperty({ description: 'Price in cents.' })
  priceCents!: number;

  @ApiProperty()
  active!: boolean;
}
