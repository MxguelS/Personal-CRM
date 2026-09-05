# Kinfolk Frontend

Next.js stable (16.3.4), TypeScript App Router, React 19, and Tailwind CSS 4. System fonts only. No mock data, Next API handlers, or UI component libraries.

## Local Development

Run from `frontend/` with Node.js 22:

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Start the real backend separately on port 8000. The browser always requests relative `/api` URLs; Next rewrites them to the backend.

`npm run dev` and `npm start` bind only to `127.0.0.1`. There is no authentication; do not expose this application publicly.

`API_INTERNAL_URL` defaults to `http://localhost:8000`. To override it, set it in the shell or `frontend/.env.local` before starting Next. Supply the backend origin, without `/api`. No `NEXT_PUBLIC_*` variable is required.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm start` serves a local production build. `npm test` covers the HTTP helper, changed-field payloads, and datetime preservation (including ambiguous DST times) with Node's built-in test runner. These are unit checks, not a substitute for integration testing against the backend.

## Docker

From the repository root:

```sh
docker build -t personal-crm-frontend --build-arg API_INTERNAL_URL=http://backend:8000 frontend
docker run --rm -p 127.0.0.1:3000:3000 --network YOUR_COMPOSE_NETWORK personal-crm-frontend
```

The multi-stage image runs standalone Next as a non-root user and listens on `0.0.0.0` inside the container; publish its host port on loopback only. The build argument defaults to `http://backend:8000`; compose should use `frontend/` as the build context and connect this service to the backend network. Rewrites are baked into the production build, so changing only a runtime environment variable does not retarget the proxy. Rebuild with the desired `API_INTERNAL_URL`.

## Behavior

- Overview: live totals, status breakdown, recent interactions, and upcoming follow-ups.
- Contacts: debounced search, status filtering, sorting, 20-row pagination, creation, and linked detail pages. Editing and confirmed deletion are on the detail page.
- Contact detail: all contact fields, notes, follow-up scheduling/clearing, and interaction creation, editing, and confirmed deletion.
- Both contact data and interaction history reload after every detail mutation, including deletions, so backend-derived timestamps stay authoritative. `last_contacted_at` is never submitted.
- Edits PATCH only fields changed from the form's initial values; unrelated updates from another tab are not overwritten. Concurrent edits to the same field remain last-write-wins. Unchanged datetime inputs preserve the original timestamp, including seconds and DST offset. Saving an unchanged form sends no mutation request.
- Follow-ups: paginated today, overdue, and upcoming lists. Buckets use backend UTC days and exclude closed contacts. Display and native datetime inputs use local time; requests submit timezone-aware ISO timestamps.
- Native dialogs provide modal focus trapping and Escape dismissal. Forms preserve input on failed requests, prevent duplicate submission, and show API error messages. Loading, retry, and empty states are provided throughout.

## Manual Integration Check

With the real backend running, create a contact, search/filter it, edit its details, schedule and clear a follow-up, and check the appropriate UTC bucket. Log two interactions with different times; edit and delete the newest, verifying the contact's derived last-contacted value refreshes. Delete the contact and verify it disappears from contacts and the dashboard. Check keyboard dialog navigation and a mobile viewport. Destructive actions always require confirmation.
