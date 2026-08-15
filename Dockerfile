FROM node:20-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:../data/gallery.db"
ENV AUTH_SECRET="build-placeholder-secret-at-least-32-chars"
RUN npx prisma generate
RUN npm run build

# Prisma CLI needs its full dependency tree (effect, c12, …), not only the prisma/ folders.
FROM node:20-bookworm-slim AS prisma-cli
WORKDIR /cli
COPY package.json ./
RUN node -e "const fs=require('fs'); const p=JSON.parse(fs.readFileSync('package.json','utf8')); fs.writeFileSync('package.json', JSON.stringify({name:'prisma-cli',private:true,dependencies:{prisma:p.devDependencies.prisma,'@prisma/client':p.dependencies['@prisma/client']}}))" \
  && npm install --omit=dev

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prisma-cli --chown=nextjs:nodejs /cli/node_modules ./node_modules
RUN mkdir -p data/uploads/originals data/uploads/thumbs data/uploads/display data/uploads/covers \
  && chown -R nextjs:nodejs /app/data
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/prisma/build/index.js db push --skip-generate && node server.js"]
