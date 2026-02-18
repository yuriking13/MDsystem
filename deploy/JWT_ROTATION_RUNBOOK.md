# JWT Rotation Runbook (Operational Hardening)

This runbook defines strict rotation protocol for JWT signing keys.

## 1) Rotation model

Two explicit modes are supported:

- `JWT_ROTATION_MODE=stable`
  - normal state
  - `JWT_SECRET_PREVIOUS` **must be empty**
- `JWT_ROTATION_MODE=rotation`
  - temporary state during key cutover
  - `JWT_SECRET_PREVIOUS` is allowed only inside configured window

Startup preflight validation blocks unsafe combinations.

## 2) Required env for rotation mode

When `JWT_ROTATION_MODE=rotation`, all values below are required:

- `JWT_SECRET` (new active key)
- `JWT_SECRET_PREVIOUS` (old key)
- `JWT_SECRET_KID` (new key id)
- `JWT_SECRET_PREVIOUS_KID` (old key id, must differ)
- `JWT_ROTATION_STARTED_AT` (ISO-8601 with timezone, e.g. `2026-02-18T10:00:00Z`)
- `JWT_ROTATION_WINDOW_MINUTES` (integer, 1..10080)

## 3) Strict protocol

### Step A — prepare rotation deploy

1. Generate new key.
2. Set:
   - `JWT_SECRET=<new>`
   - `JWT_SECRET_PREVIOUS=<old>`
   - `JWT_ROTATION_MODE=rotation`
   - `JWT_ROTATION_STARTED_AT=<now UTC>`
   - `JWT_ROTATION_WINDOW_MINUTES=<window>`
3. Deploy.

Recommended window:

- at least access token TTL + clock skew + rollback buffer;
- practical baseline: 60 minutes unless your TTL/policies require longer.

### Step B — rotation window

- New tokens are issued with current key (`JWT_SECRET`).
- Tokens signed by previous key remain valid only during the window.
- Monitor auth 401/5xx and Sentry alerts.

### Step C — finalize rotation

After window expires (and rollout is stable), deploy with:

- `JWT_ROTATION_MODE=stable`
- `JWT_SECRET_PREVIOUS=` (empty)
- `JWT_ROTATION_STARTED_AT=` (empty)
- `JWT_ROTATION_WINDOW_MINUTES=` (empty)

This removes acceptance of old-key tokens.

## 4) Safety checks enforced at startup

The API process fails fast if:

- `JWT_SECRET_PREVIOUS == JWT_SECRET`
- `JWT_SECRET_PREVIOUS_KID == JWT_SECRET_KID`
- `JWT_ROTATION_MODE=stable` while previous key is set
- `JWT_ROTATION_MODE=rotation` without required metadata
- `JWT_ROTATION_STARTED_AT` is too far in the future (>5m skew)
- rotation window is already expired

## 5) Rollback guidance

If auth regression happens during rotation:

1. Keep `JWT_ROTATION_MODE=rotation`.
2. Keep both keys configured.
3. Roll back app code.
4. Re-evaluate and restart rotation window from a new `JWT_ROTATION_STARTED_AT`.

Never keep `JWT_SECRET_PREVIOUS` indefinitely in stable mode.
