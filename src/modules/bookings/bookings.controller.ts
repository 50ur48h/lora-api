import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { BookingsService } from './bookings.service';
import { BookingListItemDto } from './dto/booking-list-item.dto';
import { UpdateBookingStatusDto } from './dto/update-booking-status.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
@Roles(Role.TENANT_OWNER, Role.STORE_MANAGER, Role.STAFF)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  /** Bookings for the authenticated user's tenant (admin dashboard). */
  @Get()
  @ApiOkResponse({ type: [BookingListItemDto] })
  list(): Promise<BookingListItemDto[]> {
    return this.bookings.list();
  }

  /** Transitions a booking's status (confirm, complete, cancel, no-show). */
  @Patch(':id/status')
  @ApiOkResponse({ type: BookingListItemDto })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingStatusDto,
  ): Promise<BookingListItemDto> {
    return this.bookings.updateStatus(id, dto.status);
  }
}
