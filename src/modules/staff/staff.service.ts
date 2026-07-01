import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { CreateStaffDto } from './dto/create-staff.dto';
import type { StaffMemberDto } from './dto/staff-member.dto';
import type { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lists the tenant's staff (optionally filtered to one store). */
  async list(storeId?: string): Promise<StaffMemberDto[]> {
    const staff = await this.prisma.scoped.staff.findMany({
      where: storeId ? { storeId } : undefined,
      orderBy: { name: 'asc' },
    });
    return staff.map(toDto);
  }

  async create(tenantId: string, dto: CreateStaffDto): Promise<StaffMemberDto> {
    await this.assertStore(dto.storeId);
    // Scoped create still type-requires tenantId; the RLS context matches it.
    const created = await this.prisma.scoped.staff.create({
      data: {
        tenantId,
        storeId: dto.storeId,
        name: dto.name,
        jobTitle: dto.jobTitle ?? null,
        photoUrl: dto.photoUrl ?? null,
        active: dto.active ?? true,
      },
    });
    return toDto(created);
  }

  async update(id: string, dto: UpdateStaffDto): Promise<StaffMemberDto> {
    const existing = await this.prisma.scoped.staff.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Staff not found');
    }
    const updated = await this.prisma.scoped.staff.update({
      where: { id },
      data: {
        name: dto.name,
        jobTitle: dto.jobTitle,
        photoUrl: dto.photoUrl,
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
  jobTitle: string | null;
  photoUrl: string | null;
  active: boolean;
}): StaffMemberDto {
  return {
    id: s.id,
    storeId: s.storeId,
    name: s.name,
    jobTitle: s.jobTitle,
    photoUrl: s.photoUrl,
    active: s.active,
  };
}
