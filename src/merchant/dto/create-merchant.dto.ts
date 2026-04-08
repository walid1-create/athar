import { MerchantType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateMerchantDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: MerchantType })
  @IsEnum(MerchantType)
  merchantType: MerchantType;

  @ApiProperty()
  @IsString()
  websiteUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checkoutBaseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productsEndpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoriesEndpoint?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authType?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @Transform(({ value }) => {
    if (value == null || value === '') {
      return undefined;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  authConfig?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === false) {
      return value;
    }
    if (typeof value === 'string') {
      if (value.toLowerCase() === 'true') {
        return true;
      }
      if (value.toLowerCase() === 'false') {
        return false;
      }
    }
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
