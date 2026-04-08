import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginSuperAdminDto } from './dto/login-super-admin.dto';
import { RegisterSuperAdminDto } from './dto/register-super-admin.dto';

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

    return admin;
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
      },
    };
  }
}
