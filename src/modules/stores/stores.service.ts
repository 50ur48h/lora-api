import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { StoreResponseDto } from './dto/store-response.dto';
import type { StaffResponseDto } from './dto/staff-response.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists the stores visible to the caller's tenant (RLS-scoped). */
  async list(): Promise<StoreResponseDto[]> {
    const stores = await this.prisma.scoped.store.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return stores.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      timezone: s.timezone,
      customDomain: s.customDomain,
      createdAt: s.createdAt,
    }));
  }

  /** Lists active staff for a store the caller's tenant owns. */
  async listStaff(storeId: string): Promise<StaffResponseDto[]> {
    // Confirm the store is visible to this tenant (RLS + app-layer scoping).
    const store = await this.prisma.scoped.store.findFirst({
      where: { id: storeId },
      select: { id: true },
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const staff = await this.prisma.scoped.staff.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });
    return staff.map((m) => ({
      id: m.id,
      storeId: m.storeId,
      name: m.name,
      jobTitle: m.jobTitle,
      photoUrl: m.photoUrl,
      active: m.active,
    }));
  }
}
