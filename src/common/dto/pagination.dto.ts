import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

/** Cursor-based pagination query for list endpoints. */
export class PaginationQueryDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 20,
    description: 'Maximum number of items to return.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    description: 'Opaque cursor (id of the last item from the previous page).',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

/** Standard envelope for paginated list responses. */
export class PaginatedResult<T> {
  items!: T[];
  nextCursor!: string | null;
}
