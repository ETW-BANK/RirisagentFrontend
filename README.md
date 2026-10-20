# StudentAssist

A responsive React chat frontend for the StudentAssist API.

## Start the frontend

```sh
npm install
npm run dev
```

## GitHub Pages

The site is published at `https://etw-bank.github.io/RirisagentFrontend/`. The
repository includes a GitHub Actions workflow that runs tests, lint, and the
production build before deployment. GitHub currently reports that Actions jobs
cannot start because of an account billing issue; until that is resolved, updates
to the published `gh-pages` branch must be made manually.

The StudentAssist API must allow the GitHub Pages origin
`https://etw-bank.github.io` through CORS for browser chat requests to work. The
local development proxy does not apply to the static Pages deployment.

Vite proxies `/api` requests to `https://ririsagent.runasp.net` by default, avoiding
the API's current browser CORS preflight failure during local development. To point
the frontend and development proxy at another environment, create a `.env.local`
file and set:

```text
VITE_API_BASE_URL=https://your-api-host
```

## API contract notes

The client follows the OpenAPI document at
`https://ririsagent.runasp.net/swagger/v1/swagger.json`:

- Chat uses `POST /api/Agent/chat` with `question`, optional `conversationId`, and
  optional `documentId`.
- The API exposes upload as `POST /api/Agent/upload` with a multipart `file`
  field. Document upload is not part of this chat interface.
- Swagger currently has no subject property, document-list endpoint, or documented
  success-response schema. A direct API request currently returns `answer`,
  `conversationId`, and `citations` (`documentId`, `fileName`, `pageNumber`, `text`);
  the client parses those observed fields but Swagger should be updated to guarantee
  them. The subject inputs are therefore local guidance only
  and are not sent to the API. An optional existing document UUID can be supplied
  manually; the frontend does not invent document IDs.
- The backend's current OPTIONS response does not allow browser cross-origin
  requests. The Vite proxy handles local development. A production frontend hosted
  on a different origin requires the API to allow that origin via CORS.

Conversation history is kept in memory for the current page session only.

## Checks

```sh
npm run build
npm run test
npm run lint
```
