# SECURITY OPERATIONS

## Role-Based Access Control (RBAC)
- Admin interactions enforce hierarchical logic via `AuthorizationService`.
- **Last-Owner Protection:** `SUPER_ADMIN` accounts possessing full business control cannot be downgraded or deleted if they are the last existing owner.

## Rate Limiting
- The memory-backed `RateLimitStore` prevents brute force and enumeration attacks on sensitive routes.
- **Limitation:** In a multi-node Vercel deployment, this in-memory store fails to globally sync. A distributed Redis/KV solution is required for precise production traffic shaping.

## Edge Security
- **CSP/HSTS:** Strict Headers block `unsafe-eval`, frame injections, and non-HTTPS downgrades.
- **Session Revocation:** Auth.js enforces strict cookie bounds. Passwords/Sessions can be actively revoked by incrementing the `sessionVersion` column in PostgreSQL.

## Log Privacy
- `safeSerialize()` masks database connection strings, stack traces, and PII from both user responses and system `stdout` logs. Vercel Log Drains act as the ingestion point for forensic analysis.
