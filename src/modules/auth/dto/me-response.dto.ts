import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class MeResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: Role })
  role!: Role;

  @ApiProperty({ format: 'uuid', nullable: true })
  tenantId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  storeId!: string | null;
}
