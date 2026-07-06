import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin wrapper around PrismaClient managing its connection lifecycle.
 * The tenant-scoping extension (core/prisma/tenant-scoping.extension) is applied
 * at module construction; platform-scoped operations (e.g. tenant provisioning,
 * listing across tenants) use this base client directly and opt out of scoping.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
