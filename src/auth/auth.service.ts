import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginMerchantDto } from './dto/login-merchant.dto';
import { LoginSuperAdminDto } from './dto/login-super-admin.dto';
import { LoginDriverDto } from './dto/login-driver.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterMerchantDto } from './dto/register-merchant.dto';
import { RegisterSuperAdminDto } from './dto/register-super-admin.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { RegisterUserDto } from './dto/register-user.dto';

/** Account role returned on merchant auth (store operator). */
export const MERCHANT_ACCOUNT_ROLE = 'admin' as const;
/** Account role returned on super-admin auth (API body; JWT still uses role SUPER_ADMIN). */
export const SUPER_ADMIN_ACCOUNT_ROLE = 'super_admin' as const;
/** Account role returned on customer (app user) auth. */
export const USER_ACCOUNT_ROLE = 'user' as const;
/** Account role returned on delivery driver auth. */
export const DRIVER_ACCOUNT_ROLE = 'driver' as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async registerSuperAdmin(dto: RegisterSuperAdminDto) {
    const existing = await this.prisma.superAdmin.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Super admin with email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const admin = await this.prisma.superAdmin.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });

    return {
      ...admin,
      role: SUPER_ADMIN_ACCOUNT_ROLE,
    };
  }

  async loginSuperAdmin(dto: LoginSuperAdminDto) {
    const admin = await this.prisma.superAdmin.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
        isActive: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      role: 'SUPER_ADMIN',
    });

    return {
      accessToken,
      admin: {
        id: admin.id,
        fullName: admin.fullName,
        email: admin.email,
        phone: admin.phone,
        role: SUPER_ADMIN_ACCOUNT_ROLE,
      },
    };
  }

  async registerMerchant(dto: RegisterMerchantDto) {
    const existing = await this.prisma.merchant.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('A merchant with this email or phone already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const merchant = await this.prisma.merchant.create({
      data: {
        name: dto.merchantName,
        merchantTypeId: dto.merchantTypeId,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        merchantTypeId: true,
        merchantType: { select: { code: true } },
        email: true,
        phone: true,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: merchant.id,
      email: merchant.email!,
      role: 'MERCHANT',
      merchantId: merchant.id,
    });

    return {
      accessToken,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        merchantTypeId: merchant.merchantTypeId,
        merchantType: merchant.merchantType.code,
        email: merchant.email,
        phone: merchant.phone,
        role: MERCHANT_ACCOUNT_ROLE,
      },
    };
  }

  async loginMerchant(dto: LoginMerchantDto) {
    const merchant = await this.prisma.merchant.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
        isActive: true,
        passwordHash: { not: null },
      },
      select: {
        id: true,
        name: true,
        merchantTypeId: true,
        merchantType: { select: { code: true } },
        email: true,
        phone: true,
        passwordHash: true,
      },
    });

    if (!merchant || !merchant.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, merchant.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: merchant.id,
      email: merchant.email!,
      role: 'MERCHANT',
      merchantId: merchant.id,
    });

    return {
      accessToken,
      merchant: {
        id: merchant.id,
        name: merchant.name,
        merchantTypeId: merchant.merchantTypeId,
        merchantType: merchant.merchantType.code,
        email: merchant.email,
        phone: merchant.phone,
        role: MERCHANT_ACCOUNT_ROLE,
      },
    };
  }

  async registerUser(dto: RegisterUserDto) {
    const orConditions: { email?: string; phone?: string }[] = [
      { phone: dto.phone },
    ];
    if (dto.email) {
      orConditions.push({ email: dto.email });
    }
    const existing = await this.prisma.user.findFirst({
      where: { OR: orConditions },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('A user with this phone or email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        passwordHash,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email ?? user.phone,
      role: 'USER',
    });

    return {
      accessToken,
      user: {
        ...user,
        role: USER_ACCOUNT_ROLE,
      },
    };
  }

  async loginUser(dto: LoginUserDto) {
    const appUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
        isActive: true,
      },
    });

    if (!appUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, appUser.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: appUser.id,
      email: appUser.email ?? appUser.phone,
      role: 'USER',
    });

    return {
      accessToken,
      user: {
        id: appUser.id,
        fullName: appUser.fullName,
        phone: appUser.phone,
        email: appUser.email,
        isActive: appUser.isActive,
        role: USER_ACCOUNT_ROLE,
      },
    };
  }

  async registerDriver(dto: RegisterDriverDto) {
    const orConditions: { email?: string; phone?: string }[] = [
      { phone: dto.phone },
    ];
    if (dto.email) {
      orConditions.push({ email: dto.email });
    }
    const existing = await this.prisma.driver.findFirst({
      where: { OR: orConditions },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        'A driver with this phone or email already exists',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const driver = await this.prisma.driver.create({
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        email: dto.email,
        passwordHash,
        vehicleType: dto.vehicleType,
        status: dto.status,
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        vehicleType: true,
        status: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: driver.id,
      email: driver.email ?? driver.phone,
      role: 'DRIVER',
    });

    return {
      accessToken,
      driver: {
        ...driver,
        role: DRIVER_ACCOUNT_ROLE,
      },
    };
  }

  async loginDriver(dto: LoginDriverDto) {
    const driver = await this.prisma.driver.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { phone: dto.identifier }],
        isActive: true,
      },
    });

    if (!driver) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(dto.password, driver.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: driver.id,
      email: driver.email ?? driver.phone,
      role: 'DRIVER',
    });

    return {
      accessToken,
      driver: {
        id: driver.id,
        fullName: driver.fullName,
        phone: driver.phone,
        email: driver.email,
        vehicleType: driver.vehicleType,
        status: driver.status,
        isActive: driver.isActive,
        role: DRIVER_ACCOUNT_ROLE,
      },
    };
  }
}
