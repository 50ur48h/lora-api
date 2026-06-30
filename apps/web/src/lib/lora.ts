import { createLoraClient } from '@lora/sdk';

/**
 * Shared LORA API client for the web app. Point `NEXT_PUBLIC_API_URL` at the
 * deployed API; defaults to the local dev server.
 */
export const lora = createLoraClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
});
