import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDriverDto } from './dto/login-driver.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';

@ApiTags('Delivery (driver auth)')
@Controller('auth')
export class AuthDriverController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a delivery driver and return JWT' })
  @Post('driver/register')
  registerDriver(@Body() dto: RegisterDriverDto) {
    return this.authService.registerDriver(dto);
  }

  @ApiOperation({
    summary: 'Driver login: email or phone as identifier, plus password',
  })
  @Post('driver/login')
  loginDriver(@Body() dto: LoginDriverDto) {
    return this.authService.loginDriver(dto);
  }
}
