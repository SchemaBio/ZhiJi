# syntax=docker/dockerfile:1.7

FROM node:22-alpine3.22 AS builder

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

ARG NEXT_PUBLIC_PASSWORD_HASH_ENABLED=false
ARG NEXT_PUBLIC_PRIVACY_CONSENT_REQUIRED=true
ARG NEXT_PUBLIC_DEV_MOCK_AUTH=false
ENV NEXT_PUBLIC_PASSWORD_HASH_ENABLED=$NEXT_PUBLIC_PASSWORD_HASH_ENABLED
ENV NEXT_PUBLIC_PRIVACY_CONSENT_REQUIRED=$NEXT_PUBLIC_PRIVACY_CONSENT_REQUIRED
ENV NEXT_PUBLIC_DEV_MOCK_AUTH=$NEXT_PUBLIC_DEV_MOCK_AUTH
ENV NEXT_TELEMETRY_DISABLED=1
RUN if [ "$NEXT_PUBLIC_DEV_MOCK_AUTH" = "true" ]; then \
      echo "NEXT_PUBLIC_DEV_MOCK_AUTH=true is not allowed in ZhiJi images" >&2; \
      exit 1; \
    fi

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

COPY . .

RUN pnpm typecheck && pnpm build

FROM node:22-alpine3.22 AS runner

ARG NEXT_PUBLIC_PASSWORD_HASH_ENABLED=false
ARG NEXT_PUBLIC_PRIVACY_CONSENT_REQUIRED=true
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV ZHIJI_API_URL=/api
ENV ZHIJI_BACKEND=loligo
ENV ZHIJI_DEFAULT_LOCALE=zh-CN
ENV NEXT_PUBLIC_PASSWORD_HASH_ENABLED=$NEXT_PUBLIC_PASSWORD_HASH_ENABLED
ENV NEXT_PUBLIC_PRIVACY_CONSENT_REQUIRED=$NEXT_PUBLIC_PRIVACY_CONSENT_REQUIRED

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

USER nextjs

EXPOSE 3000

LABEL org.opencontainers.image.title="ZhiJi" \
      org.opencontainers.image.description="SchemaBio somatic tumor analysis web application" \
      org.opencontainers.image.source="https://github.com/SchemaBio/ZhiJi"

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]

STOPSIGNAL SIGTERM
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
