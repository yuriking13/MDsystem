/**
 * Sentry Error Tracking Plugin для Fastify
 * 
 * Автоматически отправляет ошибки в Sentry с контекстом:
 * - User ID
 * - Request info
 * - Tags (environment, version)
 */

import fp from 'fastify-plugin';
import type { FastifyPluginAsync, FastifyRequest, FastifyError } from 'fastify';
import * as Sentry from '@sentry/node';
import { env } from '../env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('sentry');

// Initialize Sentry
const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: env.NODE_ENV || 'development',
    release: process.env.npm_package_version || '1.0.0',
    
    // Performance monitoring
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Filter out specific errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      
      // Don't send 4xx errors
      if (error && typeof error === 'object' && 'statusCode' in error) {
        const statusCode = (error as { statusCode: number }).statusCode;
        if (statusCode >= 400 && statusCode < 500) {
          return null;
        }
      }
      
      return event;
    },
    
    // Integrations
    integrations: [
      Sentry.httpIntegration(),
    ],
  });
  
  log.info('Sentry initialized');
} else {
  log.warn('SENTRY_DSN not set, error tracking disabled');
}

// Helper to extract user context from request
function getUserContext(request: FastifyRequest): Sentry.User | undefined {
  try {
    const user = (request as any).user;
    if (user?.id) {
      return {
        id: user.id,
        email: user.email,
      };
    }
  } catch {
    // No user context available
  }
  return undefined;
}

// Plugin
const sentryPlugin: FastifyPluginAsync = async (fastify) => {
  if (!SENTRY_DSN) {
    return; // Skip if Sentry not configured
  }

  // Set user context on each request
  fastify.addHook('onRequest', async (request) => {
    const user = getUserContext(request);
    if (user) {
      Sentry.setUser(user);
    }
    
    // Add request context
    Sentry.setContext('request', {
      url: request.url,
      method: request.method,
      headers: {
        'user-agent': request.headers['user-agent'],
        'content-type': request.headers['content-type'],
      },
    });
  });

  // Clear user context after response
  fastify.addHook('onResponse', async () => {
    Sentry.setUser(null);
  });

  // Capture errors
  fastify.addHook('onError', async (request, _reply, error: FastifyError) => {
    // Don't capture 4xx errors
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return;
    }

    Sentry.withScope((scope) => {
      // Add user
      const user = getUserContext(request);
      if (user) {
        scope.setUser(user);
      }

      // Add request info
      scope.setTag('method', request.method);
      scope.setTag('url', request.url);
      
      // Add extra data
      scope.setExtra('query', request.query);
      scope.setExtra('params', request.params);
      
      // Capture the error
      Sentry.captureException(error);
    });
  });

  // Graceful shutdown - flush events
  fastify.addHook('onClose', async () => {
    await Sentry.close(2000);
  });
};

export default fp(sentryPlugin, {
  name: 'sentry',
  fastify: '5.x',
});

// Export Sentry for manual use
export { Sentry };
