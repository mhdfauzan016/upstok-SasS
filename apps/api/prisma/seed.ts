/**
 * Idempotent development seed.
 *
 * Creates: subscription plans, a platform admin, and a demo tenant ("acme")
 * with an owner, an active subscription, a category, and two products with
 * inventory. Safe to run repeatedly — all writes are upserts.
 *
 * Run with:  npm run db:seed   (or `prisma migrate reset` which calls it)
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Shared dev password for every seeded account.
const DEV_PASSWORD = 'Password123!';

async function main() {
  const passwordHash = await argon2.hash(DEV_PASSWORD, {
    type: argon2.argon2id,
  });

  // ---- Plans ----
  const [starter, growth] = await Promise.all([
    prisma.plan.upsert({
      where: { code: 'starter' },
      update: {},
      create: {
        code: 'starter',
        name: 'Starter',
        priceAmount: 0,
        currency: 'IDR',
        billingInterval: 'monthly',
        maxProducts: 25,
        maxOrdersPerMonth: 100,
        maxStaffSeats: 1,
        allowsCustomDomain: false,
      },
    }),
    prisma.plan.upsert({
      where: { code: 'growth' },
      update: {},
      create: {
        code: 'growth',
        name: 'Growth',
        priceAmount: 19900000, // IDR 199,000 in minor units
        currency: 'IDR',
        billingInterval: 'monthly',
        maxProducts: 1000,
        maxOrdersPerMonth: 5000,
        maxStaffSeats: 5,
        allowsCustomDomain: true,
      },
    }),
    prisma.plan.upsert({
      where: { code: 'pro' },
      update: {},
      create: {
        code: 'pro',
        name: 'Pro',
        priceAmount: 49900000,
        currency: 'IDR',
        billingInterval: 'monthly',
        maxProducts: null,
        maxOrdersPerMonth: null,
        maxStaffSeats: 20,
        allowsCustomDomain: true,
      },
    }),
  ]);

  // ---- Platform admin ----
  await prisma.platformUser.upsert({
    where: { email: 'admin@upstock.my.id' },
    update: {},
    create: {
      email: 'admin@upstock.my.id',
      passwordHash,
      name: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
    },
  });

  // ---- Demo tenant: acme ----
  const acmeBranding = {
    primaryColor: '#2563eb',
    theme: 'default',
    description:
      'Acme Sandals — distributor sandal grosir untuk reseller & toko retail. Harga pabrik, stok ready, kirim seluruh Indonesia.',
    address: 'Jl. Industri Sandal No. 88, Cibaduyut, Bandung, Jawa Barat',
    phone: '0822-7644-1753',
    email: 'sales@acme.test',
  };
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme' },
    update: { branding: acmeBranding },
    create: {
      slug: 'acme',
      name: 'Acme Sandals',
      status: 'active',
      branding: acmeBranding,
    },
  });

  const owner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@acme.test' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'owner@acme.test',
      passwordHash,
      name: 'Acme Owner',
      role: 'TENANT_OWNER',
    },
  });

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { ownerUserId: owner.id },
  });

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      planId: growth.id,
      status: 'active',
    },
  });

  // ---- A demo customer ----
  await prisma.customer.upsert({
    where: {
      tenantId_email: { tenantId: tenant.id, email: 'buyer@acme.test' },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'buyer@acme.test',
      passwordHash,
      name: 'Demo Buyer',
    },
  });

  // ---- Category + products ----
  // A compound unique containing a nullable column (parentId) can't be used
  // with upsert/findUnique when the value is null, so find-or-create instead.
  const category =
    (await prisma.category.findFirst({
      where: { tenantId: tenant.id, parentId: null, slug: 'sandals' },
    })) ??
    (await prisma.category.create({
      data: { tenantId: tenant.id, name: 'Sandals', slug: 'sandals' },
    }));

  const products = [
    { name: 'Sandal Jepit Classic', slug: 'sandal-jepit-classic', sku: 'SJ-001', price: 2500000, qty: 50 },
    { name: 'Sandal Gunung Pro', slug: 'sandal-gunung-pro', sku: 'SG-002', price: 12500000, qty: 12 },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        categoryId: category.id,
        name: p.name,
        slug: p.slug,
        sku: p.sku,
        priceAmount: p.price,
        currency: 'IDR',
        status: 'active',
        images: [],
        inventory: {
          create: {
            tenantId: tenant.id,
            quantityOnHand: p.qty,
            lowStockThreshold: 5,
          },
        },
      },
    });
  }

  // ---- A demo order (idempotent by orderNumber) with a stock movement ----
  const demoOrderNumber = 'ORD-SEED-000001';
  const existingOrder = await prisma.order.findFirst({
    where: { tenantId: tenant.id, orderNumber: demoOrderNumber },
  });
  if (!existingOrder) {
    const firstProduct = await prisma.product.findFirst({
      where: { tenantId: tenant.id, slug: 'sandal-jepit-classic' },
      include: { inventory: true },
    });
    if (firstProduct?.inventory) {
      const qty = 2;
      const lineTotal = firstProduct.priceAmount * qty;
      await prisma.$transaction(async (tx) => {
        await tx.inventoryItem.update({
          where: { id: firstProduct.inventory!.id },
          data: { quantityOnHand: { decrement: qty } },
        });
        const item = await tx.inventoryItem.findUniqueOrThrow({
          where: { id: firstProduct.inventory!.id },
          select: { quantityOnHand: true },
        });
        await tx.stockMovement.create({
          data: {
            tenantId: tenant.id,
            inventoryItemId: firstProduct.inventory!.id,
            type: 'sale',
            quantityChange: -qty,
            quantityAfter: item.quantityOnHand,
            note: `order ${demoOrderNumber}`,
          },
        });
        await tx.order.create({
          data: {
            tenantId: tenant.id,
            orderNumber: demoOrderNumber,
            customerName: 'Toko Demo',
            customerPhone: '081234567890',
            customerAddress: 'Jl. Demo No. 1, Jakarta',
            status: 'pending',
            currency: 'IDR',
            subtotalAmount: lineTotal,
            totalAmount: lineTotal,
            items: {
              create: {
                productId: firstProduct.id,
                productName: firstProduct.name,
                sku: firstProduct.sku,
                unitPriceAmount: firstProduct.priceAmount,
                quantity: qty,
                lineTotalAmount: lineTotal,
              },
            },
          },
        });
      });
    }
  }

  console.log('✔ Seed complete');
  console.log('  Platform admin : admin@upstock.my.id');
  console.log('  Tenant owner   : owner@acme.test   (tenant: acme)');
  console.log('  Customer       : buyer@acme.test   (tenant: acme)');
  console.log(`  Password (all) : ${DEV_PASSWORD}`);
  console.log(`  Plans          : ${starter.code}, ${growth.code}, pro`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
