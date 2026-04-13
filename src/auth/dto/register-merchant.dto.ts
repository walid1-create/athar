import { MerchantType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterMerchantDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(50)
  phone: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Store / business display name' })
  @IsString()
  @MaxLength(255)
  merchantName: string;

  @ApiProperty({ enum: MerchantType })
  @IsEnum(MerchantType)
  merchantType: MerchantType;
}
