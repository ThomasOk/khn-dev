import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    // Selects the HTTP session store (admin login sessions). Without it,
    // Express falls back to its in-memory MemoryStore — every redeploy logs
    // out all admins, and it's explicitly unsupported for production.
    // Undefined locally (no Redis running there), which is fine: the same
    // falsy check that picks Redis here falls back to MemoryStore.
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    // Redis-backed cache/event-bus/workflow-engine, only when REDIS_URL is
    // set (staging/prod). Without these, Medusa falls back to its built-in
    // in-memory implementations for all three — fine for local dev, but on
    // a real deploy an in-memory event bus can silently drop the
    // order.placed event (order-confirmation email, kitchen-ticket
    // notification) if the process restarts between publish and delivery,
    // and an in-memory workflow engine can't resume a workflow across
    // restarts either. Redis is already provisioned in both environments,
    // this was just never wired up.
    ...(process.env.REDIS_URL
      ? [
          {
            resolve: "@medusajs/medusa/cache-redis",
            options: { redisUrl: process.env.REDIS_URL },
          },
          {
            resolve: "@medusajs/medusa/event-bus-redis",
            options: { redisUrl: process.env.REDIS_URL },
          },
          {
            // Unlike cache-redis/event-bus-redis above, this module expects
            // its Redis config nested under a `redis` key, not `redisUrl`
            // directly — found by reading the loader source after a flat
            // `redisUrl` crashed with "Cannot destructure property 'url'".
            resolve: "@medusajs/medusa/workflow-engine-redis",
            options: { redis: { redisUrl: process.env.REDIS_URL } },
          },
        ]
      : []),
    // ADR 0006: capacity acceptance for table-reservation races two
    // customers against the last Couverts, so it locks on the requested
    // date. Without this registration `execute()` silently falls back to
    // the in-memory provider, which only protects a single process — the
    // lock becomes a no-op the moment a second instance runs.
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/locking-postgres",
            id: "locking-postgres",
            is_default: true,
          },
        ],
      },
    },
    {
      resolve: "./src/modules/pickup",
    },
    {
      resolve: "./src/modules/announcement",
    },
    {
      resolve: "./src/modules/table-reservation",
    },
    {
      resolve: "./src/modules/formule",
    },
    {
      resolve: "./src/modules/invoice",
    },
    {
      resolve: "./src/modules/showcase",
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              // Cloudflare R2's S3 API only supports path-style requests
              // (endpoint/bucket/key), not the AWS SDK's default
              // virtual-hosted-style (bucket.endpoint/key).
              additional_client_config: {
                forcePathStyle: true,
              },
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/resend-notification",
            id: "resend",
            options: {
              channels: ["email"],
              apiKey: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
    },
  ],
})
