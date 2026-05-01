import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/** Form fields for POST /auth/merchant/register (use multipart/form-data; files `logo` and `cover` are separate). */
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

  @ApiProperty({ format: 'uuid', description: 'Merchant type id (see GET /merchant-types)' })
  @IsUUID('4')
  merchantTypeId: string;
}
