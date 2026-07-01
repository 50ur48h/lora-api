import { ApiProperty } from '@nestjs/swagger';

export class StaffMemberDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  storeId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  jobTitle!: string | null;

  @ApiProperty({ nullable: true })
  photoUrl!: string | null;

  @ApiProperty()
  active!: boolean;
}
