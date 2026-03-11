

## Update PAStatusBadge Component

Single file change: `src/components/PAStatusBadge.tsx`

1. **Expand `paConfig`** — Change type from `Record<PAStatus, ...>` to `Record<string, ...>` and add three new keys: `approved` (maps to "PA Active"), `pending` ("PA Pending"), `denied` ("PA Denied").

2. **Update interface** — Change `status: PAStatus` to `status: string` so the component accepts any backend PA status value.

3. **Add fallback guard** — After `const config = paConfig[status]`, add an early return rendering a neutral muted badge with `Shield` icon showing the raw status text (or "No PA") when the status isn't in the config map.

4. **Clean up imports** — Remove the `PAStatus` import from `@/data/mockData` since it's no longer needed.

