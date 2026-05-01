import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from './common/hash-password';
import { UpdateMerchantDto } from './merchant/dto/update-merchant.dto';
import { MerchantCatalogService } from './merchant-catalog/merchant-catalog.service';
import { PrismaService } from './prisma/prisma.service';

export type MerchantListItem = {
  id: string;
  name: string;
  merchantTypeId: string;
  merchantType: string;
  logoUrl: string | null;
  coverImageUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MerchantIntegrationService {
  private readonly db: PrismaClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: MerchantCatalogService,
  ) {
    this.db = prisma as unknown as PrismaClient;
  }

  async getMerchants(merchantTypeCode?: string): Promise<MerchantListItem[]> {
    if (merchantTypeCode) {
      const code = merchantTypeCode.trim().toUpperCase();
      const exists = await this.db.merchantType.findUnique({
        where: { code },
        select: { id: true },
      });
      if (!exists) {
        throw new BadRequestException('Invalid merchantType filter');
      }
    }
    const whereClause = merchantTypeCode
      ? {
          merchantType: {
            code: merchantTypeCode.trim().toUpperCase(),
          },
        }
      : undefined;
    const rows = await this.db.merchant.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        merchantTypeId: true,
        imageUrl: true,
        coverImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        merchantType: { select: { code: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      merchantTypeId: r.merchantTypeId,
      merchantType: r.merchantType.code,
      logoUrl: r.imageUrl,
      coverImageUrl: r.coverImageUrl,
      isActive: r.isActive,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  private async assertUniqueMerchantCredentials(
    email: string | undefined | null,
    phone: string | undefined | null,
    excludeMerchantId?: string,
  ): Promise<void> {
    const orClause: Array<{ email: string } | { phone: string }> = [];
    if (email) {
      orClause.push({ email });
    }
    if (phone) {
      orClause.push({ phone });
    }
    if (orClause.length === 0) {
      return;
    }
    const conflict = await this.db.merchant.findFirst({
      where: {
        ...(excludeMerchantId ? { id: { not: excludeMerchantId } } : {}),
        OR: orClause,
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        'Another merchant already uses this email or phone',
      );
    }
  }

  async updateMerchant(
    merchantId: string,
    dto: UpdateMerchantDto,
  ): Promise<MerchantListItem> {
    const current = await this.db.merchant.findUnique({
      where: { id: merchantId },
      select: { email: true, phone: true },
    });

    const nextEmail = dto.email !== undefined ? dto.email : current?.email;
    const nextPhone = dto.phone !== undefined ? dto.phone : current?.phone;

    if (
      typeof dto.password === 'string' &&
      dto.password.length > 0 &&
      (!nextEmail || !nextPhone)
    ) {
      throw new BadRequestException(
        'Merchant must have both email and phone before a password can be set',
      );
    }

    if (dto.email !== undefined || dto.phone !== undefined) {
      await this.assertUniqueMerchantCredentials(
        dto.email !== undefined ? dto.email : undefined,
        dto.phone !== undefined ? dto.phone : undefined,
        merchantId,
      );
    }

    let passwordHash: string | undefined;
    const newPassword = dto.password;
    if (typeof newPassword === 'string' && newPassword.length > 0) {
      passwordHash = await hashPassword(newPassword);
    }

    const updated = await this.db.merchant.update({
      where: { id: merchantId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.merchantTypeId !== undefined
          ? { merchantTypeId: dto.merchantTypeId }
          : {}),
        ...(dto.logoUrl !== undefined ? { imageUrl: dto.logoUrl } : {}),
        ...(dto.coverImageUrl !== undefined
          ? { coverImageUrl: dto.coverImageUrl }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.email !== undefined ? { email: dto.email } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(passwordHash !== undefined ? { passwordHash } : {}),
      },
      select: {
        id: true,
        name: true,
        merchantTypeId: true,
        imageUrl: true,
        coverImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        merchantType: { select: { code: true } },
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      merchantTypeId: updated.merchantTypeId,
      merchantType: updated.merchantType.code,
      logoUrl: updated.imageUrl,
      coverImageUrl: updated.coverImageUrl,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async updateMerchantImage(
    merchantId: string,
    logoUrl: string,
  ): Promise<MerchantListItem> {
    const updated = await this.db.merchant.update({
      where: { id: merchantId },
      data: { imageUrl: logoUrl },
      select: {
        id: true,
        name: true,
        merchantTypeId: true,
        imageUrl: true,
        coverImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        merchantType: { select: { code: true } },
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      merchantTypeId: updated.merchantTypeId,
      merchantType: updated.merchantType.code,
      logoUrl: updated.imageUrl,
      coverImageUrl: updated.coverImageUrl,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async setMerchantActive(
    merchantId: string,
    isActive: boolean,
  ): Promise<MerchantListItem> {
    const updated = await this.db.merchant.update({
      where: { id: merchantId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        merchantTypeId: true,
        imageUrl: true,
        coverImageUrl: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        merchantType: { select: { code: true } },
      },
    });
    return {
      id: updated.id,
      name: updated.name,
      merchantTypeId: updated.merchantTypeId,
      merchantType: updated.merchantType.code,
      logoUrl: updated.imageUrl,
      coverImageUrl: updated.coverImageUrl,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteMerchant(merchantId: string): Promise<{ message: string }> {
    await this.db.merchant.delete({
      where: { id: merchantId },
    });
    return { message: 'Merchant deleted successfully' };
  }
}
