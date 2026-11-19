# Imagem da demonstração pública (Render). Banco SQLite dentro do contêiner:
# a cada início, aplica as migrações e recarrega os dados fictícios do seed.
FROM node:22-slim

# O Prisma precisa do OpenSSL.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV DATABASE_URL="file:./dev.db" \
    NEXT_TELEMETRY_DISABLED=1

# Dependências de desenvolvimento ficam: o início usa prisma e tsx (migração + seed).
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/reindexar.ts && npx prisma db seed && npx next start -p ${PORT:-3000}"]
