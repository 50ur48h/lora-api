import createClient, {
  type Client,
  type ClientOptions,
} from 'openapi-fetch';
import type { paths } from './generated/schema';

/** Resolves to a bearer token — a string, or a (possibly async) factory. */
export type TokenProvider = string | (() => string | Promise<string>);

export interface LoraClientOptions {
  /** Base URL of the LORA API, e.g. `https://api.lora.app` or `http://localhost:3000`. */
  baseUrl: string;
  /** Optional bearer token (or factory) attached to every request. */
  token?: TokenProvider;
  /** Custom fetch implementation (defaults to the global `fetch`). */
  fetch?: ClientOptions['fetch'];
}

/** A fully-typed LORA API client (thin wrapper over `openapi-fetch`). */
export type LoraClient = Client<paths>;

/**
 * Creates a typed LORA API client. Every path, method, params, request body
 * and response is checked against the OpenAPI contract at compile time.
 *
 * ```ts
 * const lora = createLoraClient({ baseUrl: 'http://localhost:3000', token });
 * const { data, error } = await lora.GET('/v1/stores');
 * ```
 */
export function createLoraClient(options: LoraClientOptions): LoraClient {
  const client = createClient<paths>({
    baseUrl: options.baseUrl,
    ...(options.fetch ? { fetch: options.fetch } : {}),
  });

  const { token } = options;
  if (token !== undefined) {
    client.use({
      async onRequest({ request }) {
        const value = typeof token === 'function' ? await token() : token;
        if (value) {
          request.headers.set('Authorization', `Bearer ${value}`);
        }
        return request;
      },
    });
  }

  return client;
}
