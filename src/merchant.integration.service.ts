import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MerchantType, Prisma, PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { CreateMerchantDto } from './merchant/dto/create-merchant.dto';
import { UpdateMerchantDto } from './merchant/dto/update-merchant.dto';
import { PrismaService } from './prisma/prisma.service';

type UnifiedProduct = {
  name: string;
  images: string[];
  price: number;
  category?: string | null;
};

type MerchantConfig = {
  isActive: boolean;
  productsEndpoint: string | null;
  websiteUrl: string;
  authConfig: unknown;
};

export type MerchantListItem = {
  id: string;
  externalId: string | null;
  name: string;
  merchantType: string;
  imageUrl: string | null;
  websiteUrl: string;
  checkoutBaseUrl: string | null;
  productsEndpoint: string | null;
  categoriesEndpoint: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class MerchantIntegrationService {
  private readonly logger = new Logger(MerchantIntegrationService.name);
  private readonly cacheTtlSeconds = Number(
    process.env.MERCHANT_PRODUCTS_CACHE_TTL_SECONDS ?? 120,
  );
  private readonly requestTimeoutMs = Number(
    process.env.MERCHANT_PRODUCTS_TIMEOUT_MS ?? 4000,
  );
  private readonly retryCount = Number(
    process.env.MERCHANT_PRODUCTS_RETRY_COUNT ?? 1,
  );
  private readonly memoryCache = new Map<
    string,
    { value: UnifiedProduct[]; expiresAt: number }
  >();
  private readonly redis?: Redis;
  private readonly db: PrismaClient;

  constructor(private readonly prisma: PrismaService) {
    this.db = prisma as unknown as PrismaClient;
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
      });
      this.redis.on('error', (error) => {
        this.logger.warn(
          `Redis unavailable, using memory cache: ${error.message}`,
        );
      });
    }
  }

  async getMerchants(merchantType?: MerchantType): Promise<MerchantListItem[]> {
    const whereClause = merchantType
      ? ({ merchantType } as { merchantType: MerchantType })
      : undefined;
    return this.db.merchant.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        externalId: true,
        name: true,
        merchantType: true,
        imageUrl: true,
        websiteUrl: true,
        checkoutBaseUrl: true,
        productsEndpoint: true,
        categoriesEndpoint: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    }) as Promise<MerchantListItem[]>;
  }

  async createMerchant(dto: CreateMerchantDto): Promise<MerchantListItem> {
    try {
      return (await this.db.merchant.create({
        data: {
          name: dto.name,
          merchantType: dto.merchantType,
          websiteUrl: dto.websiteUrl,
          externalId: dto.externalId,
          imageUrl: dto.imageUrl,
          checkoutBaseUrl: dto.checkoutBaseUrl,
          productsEndpoint: dto.productsEndpoint,
          categoriesEndpoint: dto.categoriesEndpoint,
          authType: dto.authType,
          authConfig: this.toJsonValue(dto.authConfig),
          isActive: dto.isActive ?? true,
        },
        select: {
          id: true,
          externalId: true,
          name: true,
          merchantType: true,
          imageUrl: true,
          websiteUrl: true,
          checkoutBaseUrl: true,
          productsEndpoint: true,
          categoriesEndpoint: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      })) as MerchantListItem;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('externalId already exists');
      }
      throw error;
    }
  }

  async updateMerchant(
    merchantId: string,
    dto: UpdateMerchantDto,
  ): Promise<MerchantListItem> {
    return (await this.db.merchant.update({
      where: { id: merchantId },
      data: {
        name: dto.name,
        merchantType: dto.merchantType,
        websiteUrl: dto.websiteUrl,
        externalId: dto.externalId,
        imageUrl: dto.imageUrl,
        checkoutBaseUrl: dto.checkoutBaseUrl,
        productsEndpoint: dto.productsEndpoint,
        categoriesEndpoint: dto.categoriesEndpoint,
        authType: dto.authType,
        authConfig: this.toJsonValue(dto.authConfig),
        isActive: dto.isActive,
      },
      select: {
        id: true,
        externalId: true,
        name: true,
        merchantType: true,
        imageUrl: true,
        websiteUrl: true,
        checkoutBaseUrl: true,
        productsEndpoint: true,
        categoriesEndpoint: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as MerchantListItem;
  }

  async updateMerchantImage(
    merchantId: string,
    imageUrl: string,
  ): Promise<MerchantListItem> {
    return (await this.db.merchant.update({
      where: { id: merchantId },
      data: { imageUrl },
      select: {
        id: true,
        externalId: true,
        name: true,
        merchantType: true,
        imageUrl: true,
        websiteUrl: true,
        checkoutBaseUrl: true,
        productsEndpoint: true,
        categoriesEndpoint: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as MerchantListItem;
  }

  async setMerchantActive(
    merchantId: string,
    isActive: boolean,
  ): Promise<MerchantListItem> {
    const updated = (await this.db.merchant.update({
      where: { id: merchantId },
      data: { isActive },
      select: {
        id: true,
        externalId: true,
        name: true,
        merchantType: true,
        imageUrl: true,
        websiteUrl: true,
        checkoutBaseUrl: true,
        productsEndpoint: true,
        categoriesEndpoint: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })) as MerchantListItem;

    await this.clearMerchantProductsCache(merchantId);
    return updated;
  }

  async deleteMerchant(merchantId: string): Promise<{ message: string }> {
    await this.db.merchant.delete({
      where: { id: merchantId },
    });
    await this.clearMerchantProductsCache(merchantId);
    return { message: 'Merchant deleted successfully' };
  }

  async getMerchantProducts(merchantId: string): Promise<UnifiedProduct[]> {
    const merchant = (await this.db.merchant.findUnique({
      where: { id: merchantId },
      select: {
        isActive: true,
        productsEndpoint: true,
        websiteUrl: true,
        authConfig: true,
      },
    })) as MerchantConfig | null;

    if (!merchant || !merchant.isActive) {
      throw new NotFoundException('Merchant not found or inactive');
    }

    const cacheKey = `merchant:products:${merchantId}`;
    const cached = await this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const endpoint = merchant.productsEndpoint ?? '/products';
    const url = new URL(endpoint, merchant.websiteUrl).toString();
    const response = await this.fetchWithRetry(
      url,
      this.buildHeaders(merchant.authConfig),
    );
    if (!response.ok) {
      throw new NotFoundException(
        `Unable to fetch merchant products: ${response.status}`,
      );
    }

    const body = (await response.json()) as unknown;
    const productList = this.extractProductsArray(body);

    const normalized = productList.map((item) => this.toUnifiedProduct(item));
    await this.setCache(cacheKey, normalized);
    return normalized;
  }

  private async fetchWithRetry(
    url: string,
    headers: Record<string, string>,
  ): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.retryCount; attempt += 1) {
      try {
        return await this.fetchWithTimeout(url, headers);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  private async fetchWithTimeout(
    url: string,
    headers: Record<string, string>,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await fetch(url, {
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async getCache(cacheKey: string): Promise<UnifiedProduct[] | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(cacheKey);
        if (raw) {
          return JSON.parse(raw) as UnifiedProduct[];
        }
      } catch (error) {
        this.logger.warn(
          `Redis read failed, falling back to memory cache: ${(error as Error).message}`,
        );
      }
    }

    const cached = this.memoryCache.get(cacheKey);
    if (!cached || cached.expiresAt < Date.now()) {
      this.memoryCache.delete(cacheKey);
      return null;
    }
    return cached.value;
  }

  private async setCache(
    cacheKey: string,
    value: UnifiedProduct[],
  ): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.set(
          cacheKey,
          JSON.stringify(value),
          'EX',
          this.cacheTtlSeconds,
        );
      } catch (error) {
        this.logger.warn(
          `Redis write failed, storing in memory cache: ${(error as Error).message}`,
        );
      }
    }

    this.memoryCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + this.cacheTtlSeconds * 1000,
    });
  }

  private buildHeaders(authConfig: unknown): Record<string, string> {
    if (!authConfig || typeof authConfig !== 'object') {
      return {};
    }
    const cfg = authConfig as Record<string, unknown>;
    const headers = cfg.headers;
    if (!headers || typeof headers !== 'object') {
      return {};
    }
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(
      headers as Record<string, unknown>,
    )) {
      if (typeof value === 'string') {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  private extractProductsArray(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
      return payload as Record<string, unknown>[];
    }
    if (payload && typeof payload === 'object') {
      const p = payload as Record<string, unknown>;
      if (Array.isArray(p.data)) {
        return p.data as Record<string, unknown>[];
      }
      if (Array.isArray(p.products)) {
        return p.products as Record<string, unknown>[];
      }
    }
    return [];
  }

  private toUnifiedProduct(source: Record<string, unknown>): UnifiedProduct {
    return {
      name: this.asString(source.name),
      images: this.asImages(source.images, source.image),
      price: this.asNumber(source.price),
      category: this.asCategory(source.category, source.categoryName),
    };
  }

  private asString(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    return '';
  }

  private asNumber(value: unknown): number {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }

  private asImages(imagesValue: unknown, imageValue: unknown): string[] {
    if (Array.isArray(imagesValue)) {
      return imagesValue
        .filter((item): item is string => typeof item === 'string')
        .filter((item) => item.length > 0);
    }
    if (typeof imageValue === 'string' && imageValue.length > 0) {
      return [imageValue];
    }
    return [];
  }

  private asCategory(
    categoryValue: unknown,
    categoryNameValue: unknown,
  ): string | null {
    const category = this.asString(categoryValue);
    if (category !== '') {
      return category;
    }
    const categoryName = this.asString(categoryNameValue);
    return categoryName === '' ? null : categoryName;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value == null) {
      return undefined;
    }
    return value as Prisma.InputJsonValue;
  }

  private async clearMerchantProductsCache(merchantId: string): Promise<void> {
    const cacheKey = `merchant:products:${merchantId}`;
    this.memoryCache.delete(cacheKey);
    if (this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        this.logger.warn(
          `Redis delete failed for merchant cache: ${(error as Error).message}`,
        );
      }
    }
  }
}
