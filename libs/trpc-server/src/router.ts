import { router } from './trpc';
import { tenantsRouter } from './modules/tenants';
import { ordersRouter } from './modules/orders';
import { merchantRouter } from './modules/merchant';
import { accountingRouter } from './modules/accounting';
import { meRouter } from './modules/me';
import { invoicingRouter } from './modules/invoicing';

export const appRouter = router({
  me: meRouter,
  tenants: tenantsRouter,
  orders: ordersRouter,
  merchant: merchantRouter,
  accounting: accountingRouter,
  invoicing: invoicingRouter,
});

export type AppRouter = typeof appRouter;
