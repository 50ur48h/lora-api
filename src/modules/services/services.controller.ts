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
import { CreateServiceDto } from './dto/create-service.dto';
import { ServiceResponseDto } from './dto/service-response.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@ApiBearerAuth()
@Controller('services')
@Roles(Role.TENANT_OWNER, Role.STORE_MANAGER)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  @ApiQuery({ name: 'storeId', required: false, format: 'uuid' })
  @ApiOkResponse({ type: ServiceResponseDto, isArray: true })
  list(
    @Query('storeId', new ParseUUIDPipe({ optional: true })) storeId?: string,
  ): Promise<ServiceResponseDto[]> {
    return this.services.list(storeId);
  }

  @Post()
  @ApiCreatedResponse({ type: ServiceResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.services.create(requireTenant(user), dto);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ServiceResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.services.update(id, dto);
  }
}
