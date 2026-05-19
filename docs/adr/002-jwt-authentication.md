# ADR 002 — JWT Authentication

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2024-01-15 |
| **Tracks affected** | Next.js, FastAPI |

---

## Context

TaskForge is a multi-user application where every meaningful operation — reading projects, creating tasks, posting comments — is scoped to the identity of the caller. We needed an authentication mechanism before any other features could be built.

The core requirements were:

- **Identity verification**: every API request must be traceable to a specific user record.
- **Role awareness**: the `User` model carries `ADMIN`, `MEMBER`, and `VIEWER` roles that must be readable at request time.
- **Minimal external dependencies**: the project is designed to run fully self-hosted from a single `git clone`. Auth must not require a managed third-party service to be functional.
- **Two independent runtimes**: the Next.js track is a full-stack SSR app with server components; the FastAPI track is a stateless JSON API consumed by any HTTP client. The mechanism needs to work idiomatically in both environments.

---

## Decision

Use **JWT (JSON Web Tokens)** as the authentication primitive in both tracks, signed with HMAC-SHA256 (`HS256`) using a server-side secret key.

### FastAPI track

Login issues a Bearer token directly. The token payload contains only `sub` (the user's integer ID) and `exp` (expiry timestamp):

```python
# fastapi/app/utils/security.py
def create_access_token(data: dict[str, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

# fastapi/app/services/auth_service.py
def generate_token(user: User) -> str:
    return create_access_token(data={"sub": str(user.id)})
```

Token validation on every protected route:

```python
# fastapi/app/utils/security.py
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    user_id: int = int(payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    ...
    return user
```

Default token lifetime: 30 minutes (`ACCESS_TOKEN_EXPIRE_MINUTES` in `config.py`).

### Next.js track

Uses NextAuth with `strategy: "jwt"`. The token is stored in a `next-auth.session-token` cookie rather than returned as a Bearer token. The JWT callback embeds `id` and `role` into the token at sign-in:

```typescript
// nextjs/lib/auth.ts
callbacks: {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id;
      token.role = (user as any).role;
    }
    return token;
  },
  async session({ session, token }) {
    if (session.user) {
      (session.user as any).id = token.id;
      (session.user as any).role = token.role;
    }
    return session;
  },
},
```

The cookie-based delivery is transparent to route handlers, which read identity via `getServerSession(authOptions)`.

---

## Alternatives considered

### Server-side sessions (rejected)

Store a session ID in a cookie; map it to user state in a server-side store (database table or Redis).

**Why rejected**: requires a persistent session store as a new infrastructure dependency. For a self-contained tutorial project running on SQLite, adding Redis or a sessions table adds complexity with no functional gain. Horizontal scaling would also require sticky sessions or a shared store — neither is relevant at this scale but the constraint is a poor habit to instil.

### OAuth-only via an external provider (rejected)

Delegate authentication entirely to GitHub, Google, or similar — users sign in with an existing account, no passwords stored.

**Why rejected**: introduces a hard dependency on a third-party service. Running the project offline, in a CI environment, or in a classroom setting without external network access would break. Seed data and tutorial reproducibility depend on controlled, predictable user identities (`alice@example.com`, `admin@taskforge.com`) that an OAuth flow cannot provide without a mock provider.

NextAuth's `CredentialsProvider` was chosen specifically to keep OAuth a future option (adding a provider is a one-line change) while keeping the default path self-contained.

### Opaque tokens (rejected)

Issue random strings stored in a database; look up the token on every request.

**Why rejected**: functionally equivalent to server-side sessions. Adds a database read on every request without the JWT's benefit of self-contained validation. No meaningful advantage over sessions for this use case.

---

## Consequences

### Positive

- **No session store required.** The FastAPI track validates tokens by decoding the JWT locally — no additional database call for the token itself (though `get_current_user` does query the DB once to confirm the user still exists and fetch their current record).
- **Portable across clients.** Bearer tokens work from browsers, curl, Postman, or any HTTP client without cookie handling.
- **Embeds identity cheaply.** The Next.js track stores `id` and `role` directly in the token, making them available to any server component or route handler with a single `getServerSession` call and no extra DB round-trip.

### Negative / trade-offs

**No token revocation.** Once issued, a token is valid until its `exp` claim. Logging out on the Next.js track clears the cookie client-side but does not invalidate the token server-side. A stolen token is usable for up to 30 minutes (FastAPI default). Mitigation would require a token blocklist — not implemented.

**No refresh tokens.** Both tracks issue a single access token with no renewal mechanism. When the FastAPI token expires the user must re-authenticate via `POST /api/auth/login`. The Next.js session lifetime is controlled by NextAuth defaults (30 days for JWT strategy) and is not explicitly configured.

**Role staleness in the Next.js track.** Because `role` is embedded in the JWT at sign-in time, a role change (e.g. promoting a MEMBER to ADMIN) does not take effect until the user signs out and back in. In the FastAPI track this does not apply — `get_current_user` always fetches the current user row, so role changes are reflected on the next request.

**Secret key rotation is a hard cut-over.** Changing `SECRET_KEY` (FastAPI) or `NEXTAUTH_SECRET` (Next.js) immediately invalidates all active tokens. There is no multi-key validation window. Users will be forced to re-authenticate silently.

**`HS256` is a shared-secret scheme.** Both signing and verification use the same key. This is appropriate for a single-server deployment where the API is the only party that signs and verifies. A distributed system with separate signing and verification services would warrant `RS256` (asymmetric).

---

## Implementation notes

- FastAPI configuration: `SECRET_KEY`, `ALGORITHM` (default `HS256`), `ACCESS_TOKEN_EXPIRE_MINUTES` (default `30`) in `fastapi/.env` — see `fastapi/app/config.py`.
- Next.js configuration: `NEXTAUTH_SECRET` in `nextjs/.env` — see `nextjs/lib/auth.ts`.
- Password hashing in both tracks: bcrypt via `passlib[bcrypt]` (FastAPI, cost factor from passlib default) and `bcryptjs` (Next.js, cost factor 12 hardcoded in `prisma/seed.ts` and `app/api/auth/register/route.ts`).
