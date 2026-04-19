import Fastify from 'fastify';
import cors from '@fastify/cors';
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify';
import { appRouter, createContext, type AppRouter } from '@lunchbox/trpc-server';
import { auth } from '@lunchbox/auth';
import { authConfig } from '@lunchbox/auth';

const PORT = Number(process.env.API_PORT ?? 4000);
const HOST = process.env.API_HOST ?? '0.0.0.0';

async function main() {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss.l' } }
          : undefined,
    },
  });

  await app.register(cors, {
    origin: authConfig.trustedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  // BetterAuth — mount its handler on /api/auth/*
  app.route({
    method: ['GET', 'POST'],
    url: '/api/auth/*',
    async handler(req, reply) {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const headers = new Headers();
        for (const [k, v] of Object.entries(req.headers)) {
          if (v === undefined) continue;
          if (Array.isArray(v)) for (const x of v) headers.append(k, x);
          else headers.set(k, String(v));
        }
        const body =
          req.body && req.method !== 'GET'
            ? typeof req.body === 'string'
              ? req.body
              : JSON.stringify(req.body)
            : undefined;
        const response = await auth.handler(
          new Request(url.toString(), {
            method: req.method,
            headers,
            body,
          }),
        );
        reply.status(response.status);
        response.headers.forEach((value, key) => {
          if (key.toLowerCase() === 'set-cookie') reply.header('set-cookie', value);
          else reply.header(key, value);
        });
        reply.send(response.body ? await response.text() : null);
      } catch (err) {
        req.log.error(err);
        reply.status(500).send({ error: 'Internal Server Error' });
      }
    },
  });

  await app.register(fastifyTRPCPlugin<AppRouter>, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext: ({ req }) => createContext({ headers: req.headers }),
      onError({ error, path }) {
        app.log.error({ path, msg: error.message }, 'tRPC error');
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Lunchbox API ready on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
