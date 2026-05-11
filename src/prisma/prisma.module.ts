import { Global, Module } from '@nestjs/common';
import { PrismaLifecycleService, PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: () => PrismaService.create(),
    },
    PrismaLifecycleService,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
