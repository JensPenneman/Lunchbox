/**
 * Seed script. Creates demo tenants, products, users, and historical orders.
 *
 * We call BetterAuth's sign-up API to create users so the credential
 * password hash is in whatever format BetterAuth currently uses (scrypt by default).
 */
import { prisma, MerchantRole, TenantStatus, PlatformRole, OrderStatus } from './index';
import { auth } from '@lunchbox/auth';

function splitVat(grossCents: number, vatBp: number) {
  const rate = vatBp / 10000;
  const netCents = Math.round(grossCents / (1 + rate));
  return { netCents, vatCents: grossCents - netCents };
}

function daysAgo(n: number, hour = 12, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function signUpUser(email: string, name: string) {
  await auth.api.signUpEmail({
    body: { email, password: 'lunchbox', name },
  });
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  return user;
}

async function main() {
  console.log('Seeding Lunchbox…');

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.merchantUser.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  const merchantOwner = await signUpUser('merchant@lunchbox.test', 'Marie Merchant');
  const customer = await signUpUser('customer@lunchbox.test', 'Charlie Customer');
  const accountant = await signUpUser('accountant@lunchbox.test', 'Anna Accountant');
  const supplierUser = await signUpUser('supplier@lunchbox.test', 'Sam Supplier');

  await prisma.user.update({
    where: { id: accountant.id },
    data: { platformRole: PlatformRole.ACCOUNTANT, emailVerified: true },
  });
  await prisma.user.update({ where: { id: merchantOwner.id }, data: { emailVerified: true } });
  await prisma.user.update({ where: { id: customer.id }, data: { emailVerified: true } });
  await prisma.user.update({ where: { id: supplierUser.id }, data: { emailVerified: true } });

  const jansBroodjes = await prisma.tenant.create({
    data: {
      slug: 'jans-broodjes',
      name: "Jan's Broodjes",
      description: 'Verse belegde broodjes uit Gent. Sinds 1998.',
      legalName: 'Jan Peeters BV',
      vatNumber: 'BE0123456789',
      status: TenantStatus.ACTIVE,
    },
  });

  const leBaguette = await prisma.tenant.create({
    data: {
      slug: 'le-baguette',
      name: 'Le Baguette',
      description: 'Sandwichs artisanaux, pains maison, spécialités françaises.',
      legalName: 'Le Baguette SRL',
      vatNumber: 'BE0987654321',
      status: TenantStatus.ACTIVE,
    },
  });

  await prisma.merchantUser.create({
    data: { userId: merchantOwner.id, tenantId: jansBroodjes.id, role: MerchantRole.OWNER },
  });
  await prisma.merchantUser.create({
    data: { userId: merchantOwner.id, tenantId: leBaguette.id, role: MerchantRole.OWNER },
  });

  const products = [
    { tenantId: jansBroodjes.id, name: 'Broodje Kaas', description: 'Gouda, sla, tomaat, mayonaise.', priceCents: 450 },
    { tenantId: jansBroodjes.id, name: 'Broodje Hesp', description: 'Beenham, boter, augurk.', priceCents: 480 },
    { tenantId: jansBroodjes.id, name: 'Broodje Américain', description: 'Filet américain met ui en ei.', priceCents: 520 },
    { tenantId: jansBroodjes.id, name: 'Broodje Kip Curry', description: 'Huisgemaakte kip curry met appel.', priceCents: 540 },
    { tenantId: jansBroodjes.id, name: 'Cola Zero 33cl', description: 'Blikje.', priceCents: 200, vatRate: 2100, isTakeawayPrepared: false },
    { tenantId: leBaguette.id, name: 'Jambon Beurre', description: 'Jambon de Paris, beurre fermier, baguette tradition.', priceCents: 550 },
    { tenantId: leBaguette.id, name: 'Poulet Crudités', description: 'Poulet rôti, crudités, mayonnaise maison.', priceCents: 620 },
    { tenantId: leBaguette.id, name: 'Végé Avocat', description: 'Avocat, houmous, roquette, tomates séchées.', priceCents: 650 },
    { tenantId: leBaguette.id, name: 'Eau Spa 50cl', description: 'Bouteille.', priceCents: 180, vatRate: 600, isTakeawayPrepared: false },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  // Demo historical orders so the accounting ledger isn't empty on first run.
  const jansProducts = await prisma.product.findMany({ where: { tenantId: jansBroodjes.id } });
  const baguetteProducts = await prisma.product.findMany({ where: { tenantId: leBaguette.id } });

  interface DemoOrder {
    tenantId: string;
    pool: typeof jansProducts;
    pickCount: number;
    status: OrderStatus;
    daysAgo: number;
    hour: number;
  }

  const demo: DemoOrder[] = [
    { tenantId: jansBroodjes.id, pool: jansProducts, pickCount: 3, status: OrderStatus.FULFILLED, daysAgo: 5, hour: 12 },
    { tenantId: jansBroodjes.id, pool: jansProducts, pickCount: 2, status: OrderStatus.FULFILLED, daysAgo: 5, hour: 13 },
    { tenantId: jansBroodjes.id, pool: jansProducts, pickCount: 4, status: OrderStatus.FULFILLED, daysAgo: 4, hour: 12 },
    { tenantId: jansBroodjes.id, pool: jansProducts, pickCount: 2, status: OrderStatus.FULFILLED, daysAgo: 3, hour: 12 },
    { tenantId: jansBroodjes.id, pool: jansProducts, pickCount: 1, status: OrderStatus.FULFILLED, daysAgo: 2, hour: 12 },
    { tenantId: jansBroodjes.id, pool: jansProducts, pickCount: 3, status: OrderStatus.FULFILLED, daysAgo: 1, hour: 12 },
    { tenantId: jansBroodjes.id, pool: jansProducts, pickCount: 2, status: OrderStatus.READY, daysAgo: 0, hour: 11 },
    { tenantId: leBaguette.id, pool: baguetteProducts, pickCount: 3, status: OrderStatus.FULFILLED, daysAgo: 4, hour: 12 },
    { tenantId: leBaguette.id, pool: baguetteProducts, pickCount: 2, status: OrderStatus.FULFILLED, daysAgo: 3, hour: 13 },
    { tenantId: leBaguette.id, pool: baguetteProducts, pickCount: 4, status: OrderStatus.FULFILLED, daysAgo: 2, hour: 12 },
    { tenantId: leBaguette.id, pool: baguetteProducts, pickCount: 1, status: OrderStatus.FULFILLED, daysAgo: 1, hour: 13 },
    { tenantId: leBaguette.id, pool: baguetteProducts, pickCount: 2, status: OrderStatus.PAID, daysAgo: 0, hour: 11 },
  ];

  for (const o of demo) {
    const picks = [...o.pool].sort(() => Math.random() - 0.5).slice(0, o.pickCount);
    let subtotal = 0;
    let vat = 0;
    const itemsData = picks.map((p) => {
      const qty = 1 + Math.floor(Math.random() * 3);
      const lineTotal = p.priceCents * qty;
      const split = splitVat(lineTotal, p.vatRate);
      subtotal += split.netCents;
      vat += split.vatCents;
      return {
        productId: p.id,
        nameSnapshot: p.name,
        unitPriceCents: p.priceCents,
        vatRate: p.vatRate,
        quantity: qty,
        lineTotalCents: lineTotal,
      };
    });
    const placedAt = daysAgo(o.daysAgo, o.hour);
    await prisma.order.create({
      data: {
        tenantId: o.tenantId,
        customerId: customer.id,
        status: o.status,
        subtotalCents: subtotal,
        vatTotalCents: vat,
        totalCents: subtotal + vat,
        placedAt,
        paidAt: placedAt,
        acceptedAt: o.status !== OrderStatus.PAID ? placedAt : null,
        readyAt: ['READY', 'FULFILLED'].includes(o.status) ? placedAt : null,
        fulfilledAt: o.status === OrderStatus.FULFILLED ? placedAt : null,
        items: { create: itemsData },
      },
    });
  }

  console.log('');
  console.log('Seed complete ✓');
  console.log('  Users (password: lunchbox):');
  console.log('    customer@lunchbox.test   — regular customer');
  console.log('    merchant@lunchbox.test   — owner of both tenants');
  console.log('    accountant@lunchbox.test — ACCOUNTANT platform role');
  console.log('    supplier@lunchbox.test   — supplier (stub)');
  console.log(`  Tenants:  ${jansBroodjes.name}, ${leBaguette.name}`);
  console.log(`  Products: ${products.length}`);
  console.log(`  Orders:   ${demo.length} (across 5 days)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
