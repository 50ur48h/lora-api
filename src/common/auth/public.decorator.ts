import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route (or controller) as public — skips the JWT auth guard. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
