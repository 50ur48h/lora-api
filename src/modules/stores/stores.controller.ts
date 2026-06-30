import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { StoresService } from './stores.service';
import { StoreResponseDto } from './dto/store-response.dto';
import { StaffResponseDto } from './dto/staff-response.dto';

@ApiTags('stores')
@ApiBearerAuth()
@Controller('stores')
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get()
  @Roles(Role.TENANT_OWNER, Role.STORE_MANAGER, Role.STAFF)
  @ApiOkResponse({ type: StoreResponseDto, isArray: true })
  list(): Promise<StoreResponseDto[]> {
    return this.stores.list();
  }

  @Get(':id/staff')
  @Roles(Role.TENANT_OWNER, Role.STORE_MANAGER, Role.STAFF)
  @ApiOkResponse({ type: StaffResponseDto, isArray: true })
  listStaff(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StaffResponseDto[]> {
    return this.stores.listStaff(id);
  }
}
