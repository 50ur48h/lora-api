import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateServiceDto } from './dto/create-service.dto';
import type { ServiceResponseDto } from './dto/service-response.dto';
import type { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists the tenant's services (optionally filtered to one store). */
  async list(storeId?: string): Promise<ServiceResponseDto[]> {
    const services = await this.prisma.scoped.service.findMany({
      where: storeId ? { storeId } : undefined,
      orderBy: { name: 'asc' },
    });
    return services.map(toDto);
  }

  async create(
    tenantId: string,
    dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    await this.assertStore(dto.storeId);
    // Scoped create still type-requires tenantId; the RLS context matches it.
    const created = await this.prisma.scoped.service.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        name: dto.name,
        durationMin: dto.durationMin,
        bufferMin: dto.bufferMin ?? 0,
        priceCents: dto.priceCents,
        active: dto.active ?? true,
      },
    });
    return toDto(created);
  }

  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    const existing = await this.prisma.scoped.service.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Service not found');
    }
    const updated = await this.prisma.scoped.service.update({
      where: { id },
      data: {
        name: dto.name,
        durationMin: dto.durationMin,
        bufferMin: dto.bufferMin,
        priceCents: dto.priceCents,
        active: dto.active,
      },
    });
    return toDto(updated);
  }

  /** Ensures the store is visible to the caller's tenant before a write. */
  private async assertStore(storeId: string): Promise<void> {
    const store = await this.prisma.scoped.store.findFirst({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }
  }
}

function toDto(s: {
  id: string;
  storeId: string;
  name: string;
  durationMin: number;
  bufferMin: number;
  priceCents: number;
  active: boolean;
}): ServiceResponseDto {
  return {
    id: s.id,
    storeId: s.storeId,
    name: s.name,
    durationMin: s.durationMin,
    bufferMin: s.bufferMin,
    priceCents: s.priceCents,
    active: s.active,
  };
}
