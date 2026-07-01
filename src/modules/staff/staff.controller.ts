import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { requireTenant } from '../../common/auth/require-tenant';
import { Roles } from '../../common/auth/roles.decorator';
import { CreateStaffDto } from './dto/create-staff.dto';
import { StaffMemberDto } from './dto/staff-member.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
@Roles(Role.TENANT_OWNER, Role.STORE_MANAGER)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  @ApiQuery({ name: 'storeId', required: false, format: 'uuid' })
  @ApiOkResponse({ type: StaffMemberDto, isArray: true })
  list(
    @Query('storeId', new ParseUUIDPipe({ optional: true })) storeId?: string,
  ): Promise<StaffMemberDto[]> {
    return this.staff.list(storeId);
  }

  @Post()
  @ApiCreatedResponse({ type: StaffMemberDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffMemberDto> {
    return this.staff.create(requireTenant(user), dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: StaffMemberDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffMemberDto> {
    return this.staff.update(id, dto);
  }
}
