import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginMerchantDto } from './dto/login-merchant.dto';
import { RegisterMerchantDto } from './dto/register-merchant.dto';

@ApiTags('Merchant auth')
@Controller('auth')
export class AuthMerchantController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary: 'Register a new merchant (store + email, phone, password) and returns JWT',
  })
  @Post('merchant/register')
  registerMerchant(@Body() dto: RegisterMerchantDto) {
    return this.authService.registerMerchant(dto);
  }

  @ApiOperation({
    summary: 'Merchant login: send email or phone as identifier, plus password',
  })
  @Post('merchant/login')
  loginMerchant(@Body() dto: LoginMerchantDto) {
    return this.authService.loginMerchant(dto);
  }
}
