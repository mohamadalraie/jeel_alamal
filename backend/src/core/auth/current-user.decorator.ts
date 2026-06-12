import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Actor } from '../../shared/application/actor';

/**
 * Injects the authenticated Actor (set by AuthGuard from verified JWT claims).
 * Controllers pass it straight into use-cases — never anything client-sent.
 */
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Actor => {
    const request = ctx.switchToHttp().getRequest<Request & { actor: Actor }>();
    return request.actor;
  },
);
