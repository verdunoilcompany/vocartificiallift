# syntax=docker/dockerfile:1
# Artificial Lift for Coolify (https://hub[dev]/als). IIS hosting is separate (web.config, iis/).

########## deps ##########
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN HUSKY=0 npm ci

########## builder ##########
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# basePath is fixed into the build; it must match the URL path in Coolify's domain.
ARG NEXT_PUBLIC_BASE_PATH=/als
ENV NEXT_PUBLIC_BASE_PATH=${NEXT_PUBLIC_BASE_PATH}
# Fixed into the client bundle at build time (Coolify build variable).
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

########## runner ##########
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# The morning report saves at 6:00 AM server time, and SQL datetimes are local: use company time.
ENV TZ=America/Chicago
RUN apk add --no-cache tzdata \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Flat data files read at runtime, and where the morning report snapshots are written
# (lost on redeploy unless a volume is mounted at /app/db/morning-reports).
COPY --from=builder --chown=nextjs:nodejs /app/db ./db

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
