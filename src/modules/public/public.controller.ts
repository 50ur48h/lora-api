import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/auth/public.decorator';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { BookingResponseDto } from './dto/booking-response.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
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

  /** Open booking slots for a service on a given day. */
  @Get('stores/:slug/services/:serviceId/availability')
  @Public()
  @ApiOkResponse({ type: AvailabilityResponseDto })
  getAvailability(
    @Param('slug') slug: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Query() query: AvailabilityQueryDto,
  ): Promise<AvailabilityResponseDto> {
    return this.publicService.getAvailability(slug, serviceId, query.date);
  }

  /** Books an open slot for a customer. */
  @Post('stores/:slug/bookings')
  @Public()
  @ApiCreatedResponse({ type: BookingResponseDto })
  createBooking(
    @Param('slug') slug: string,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingResponseDto> {
    return this.publicService.createBooking(slug, dto);
  }
}
