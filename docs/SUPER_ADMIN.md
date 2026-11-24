# Super Admin setup

Set Railway server variables (never VITE_ variables):
- SUPER_ADMIN_EMAILS: comma-separated registered administrator email addresses.
- CONVEX_URL: production Convex URL if the frontend uses Convex authentication.

Redeploy Railway, then sign in with an allowlisted account. The lobby checks /api/admin/overview; only authenticated allowlisted sessions receive monitoring data. No credentials or password hashes are returned. The dashboard is read-only and polls every five seconds. No database migration is required. If no allowlist exists, access is denied by default.

Test: unauthorized /api/admin/overview returns 403; a normal player receives 403; an allowlisted player receives 200. Verify logout, expiration, room counts and reconnect counts. Existing host-relay combat remains unchanged.
