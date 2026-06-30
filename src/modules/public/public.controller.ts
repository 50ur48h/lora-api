import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator';
import { PublicStoreResponseDto } from './dto/public-store-response.dto';
import { PublicService } from './public.service';

@ApiTags('public')
@Controller('public')
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /** Public booking storefront — resolved by store slug, no auth required. */
  @Get('stores/:slug')
  @Public()
  @ApiOkResponse({ type: PublicStoreResponseDto })
  getStore(@Param('slug') slug: string): Promise<PublicStoreResponseDto> {
    return this.publicService.getStoreBySlug(slug);
  }
}
