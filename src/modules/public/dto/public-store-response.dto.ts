import { ApiProperty } from '@nestjs/swagger';

export class PublicServiceDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ description: 'Duration in minutes.' })
  durationMin!: number;

  @ApiProperty({ description: 'Price in cents (MYR).' })
  priceCents!: number;
}

export class PublicThemeDto {
  @ApiProperty({ nullable: true })
  logoUrl!: string | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description:
      'Brand colours, e.g. { "primary": "#0F766E", "accent": "#F59E0B" }.',
    example: { primary: '#0F766E', accent: '#F59E0B' },
  })
  colors!: Record<string, string>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description:
      'Font families, e.g. { "heading": "Playfair Display", "body": "Inter" }.',
    example: { heading: 'Playfair Display', body: 'Inter' },
  })
  fonts!: Record<string, string>;
}

export class PublicStoreResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  timezone!: string;

  @ApiProperty({ type: PublicThemeDto, nullable: true })
  theme!: PublicThemeDto | null;

  @ApiProperty({ type: PublicServiceDto, isArray: true })
  services!: PublicServiceDto[];
}
