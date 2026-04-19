function envOrDefault(key: string, fallback: string): string {
  const v = process.env[key];
  return v && v.length > 0 ? v : fallback;
}

export const authConfig = {
  secret: envOrDefault(
    'BETTER_AUTH_SECRET',
    'dev-secret-change-me-in-production-at-least-32-chars',
  ),
  baseURL: envOrDefault('BETTER_AUTH_URL', 'http://localhost:4000'),
  trustedOrigins: [
    envOrDefault('STORE_ORIGIN', 'http://localhost:4100'),
    envOrDefault('MERCHANT_ORIGIN', 'http://localhost:4200'),
    envOrDefault('SUPPLIER_ORIGIN', 'http://localhost:4300'),
    envOrDefault('ACCOUNTING_ORIGIN', 'http://localhost:4400'),
  ],
};
