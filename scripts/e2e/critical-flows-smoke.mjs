#!/usr/bin/env node

const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:3000";
const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;
const PROJECT_ID = process.env.PROJECT_ID;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error("TEST_EMAIL and TEST_PASSWORD are required");
  process.exit(2);
}

async function request(path, init = {}) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

function assert(condition, message, context) {
  if (!condition) {
    console.error(message, context ? `\n${JSON.stringify(context, null, 2)}` : "");
    process.exit(1);
  }
}

// 1) Optional register (idempotent)
const register = await request("/api/auth/register", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
assert(
  register.response.ok ||
    register.response.status === 409 ||
    register.response.status === 400,
  "Register step failed unexpectedly",
  { status: register.response.status, body: register.body },
);

// 2) Login
const login = await request("/api/auth/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
});
assert(login.response.ok, "Login failed", {
  status: login.response.status,
  body: login.body,
});

const accessToken = login.body?.accessToken;
const refreshToken = login.body?.refreshToken;
assert(accessToken && refreshToken, "Login response missing tokens", login.body);

// 3) Me endpoint
const me = await request("/api/auth/me", {
  method: "GET",
  headers: { authorization: `Bearer ${accessToken}` },
});
assert(me.response.ok, "Me endpoint failed", {
  status: me.response.status,
  body: me.body,
});

// 4) Refresh
const refresh = await request("/api/auth/refresh", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ refreshToken }),
});
assert(refresh.response.ok, "Refresh failed", {
  status: refresh.response.status,
  body: refresh.body,
});

const rotatedAccess = refresh.body?.accessToken;
const rotatedRefresh = refresh.body?.refreshToken;
assert(
  rotatedAccess && rotatedRefresh,
  "Refresh response missing rotated tokens",
  refresh.body,
);

// 5) Optional WS ticket smoke (if project id provided)
if (PROJECT_ID) {
  const wsTicket = await request("/api/ws-ticket", {
    method: "POST",
    headers: {
      authorization: `Bearer ${rotatedAccess}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ projectId: PROJECT_ID }),
  });

  assert(
    wsTicket.response.ok || wsTicket.response.status === 404,
    "WS ticket request failed unexpectedly",
    { status: wsTicket.response.status, body: wsTicket.body },
  );
}

// 6) Logout-all and validate refresh revocation
const logoutAll = await request("/api/auth/logout-all", {
  method: "POST",
  headers: { authorization: `Bearer ${rotatedAccess}` },
});
assert(logoutAll.response.ok, "Logout-all failed", {
  status: logoutAll.response.status,
  body: logoutAll.body,
});

const refreshAfterLogout = await request("/api/auth/refresh", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ refreshToken: rotatedRefresh }),
});
assert(
  refreshAfterLogout.response.status === 401,
  "Refresh token should be revoked after logout-all",
  {
    status: refreshAfterLogout.response.status,
    body: refreshAfterLogout.body,
  },
);

console.log(
  JSON.stringify(
    {
      ok: true,
      baseUrl: BASE_URL,
      tested: ["auth.register/login", "auth.me", "auth.refresh", "auth.logout-all"],
      wsTicketChecked: Boolean(PROJECT_ID),
    },
    null,
    2,
  ),
);
