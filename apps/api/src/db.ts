import { PrismaClient } from '@prisma/client';

/**
 * Оптимизированный Prisma клиент
 * - connection_limit: 10 - лимит соединений Prisma
 * - pool_timeout: 10 сек - таймаут получения соединения из пула
 * - Логирование медленных запросов в dev режи|me
 */
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? [
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
        // Раскомментировать для отладки:
        // { emit: 'stdout', level: 'query' },
      ]
    : ['error'],
  // Datasource URL с параметрами пула настраивается в .env:
  // DATABASE_URL="...?connection_limit=10&pool_timeout=10"
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});
