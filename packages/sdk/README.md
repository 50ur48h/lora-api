# @lora/sdk

Typed TypeScript client for the **LORA API**, generated from its OpenAPI
contract. Built on [`openapi-fetch`](https://openapi-ts.dev/openapi-fetch/) —
tiny runtime, zero client codegen, fully type-checked paths, params, bodies and
responses.

## Install (within the workspace)

```jsonc
// package.json
{
  "dependencies": {
    "@lora/sdk": "workspace:*"
  }
}
```

## Usage

```ts
import { createLoraClient } from '@lora/sdk';

const lora = createLoraClient({
  baseUrl: 'http://localhost:3000',
  token: () => session.accessToken, // string or (async) factory
});

const { data, error } = await lora.GET('/v1/stores');
if (error) throw error;
//    ^? typed as the 200 response body
```

## Regenerating

The client's types come from the API's `openapi.json`. After changing the API:

```bash
# from the repo root — refresh the contract, then the SDK types
pnpm openapi:export
pnpm --filter @lora/sdk build
```

`src/generated/` is generated and git-ignored; `pnpm build` regenerates it.
