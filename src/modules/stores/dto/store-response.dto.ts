import { ApiProperty } from '@nestjs/swagger';

export class StoreResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ example: 'Asia/Kuala_Lumpur' })
  timezone!: string;

  @ApiProperty({ nullable: true })
  customDomain!: string | null;

  @ApiProperty()
  createdAt!: Date;
}
