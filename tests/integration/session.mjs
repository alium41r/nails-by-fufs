import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

import { assertLiveWritesAllowed } from "./support/live-guard.mjs";

// Before anything privileged exists.
assertLiveWritesAllowed();

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const admin = createClient(url, secret, { auth: { persistSession: false } });

export { assertLiveWritesAllowed };

export function adminEmails() {
  return (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

async function findUserByEmail(email) {
  // The admin API has no get-by-email; page through (this project has few users).
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

/** Ensures an auth user exists, then mints a real session token pair for it. */
export async function sessionFor(email) {
  let user = await findUserByEmail(email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    user = data.user;
  }

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError) throw new Error(`generateLink: ${linkError.message}`);

  const tokenHash = link.properties?.hashed_token;
  if (!tokenHash) throw new Error("no hashed_token in generateLink response");

  // Exchange the magic-link token for a session using the public auth endpoint.
  const response = await fetch(`${url}/auth/v1/verify?token=${tokenHash}&type=magiclink&redirect_to=${encodeURIComponent("http://localhost:3100/")}`, {
    method: "GET",
    headers: { apikey: publishable },
    redirect: "manual",
  });

  const location = response.headers.get("location");
  const fragment = location?.split("#")[1];
  if (!fragment) {
    const body = await response.text().catch(() => "");
    throw new Error(`verify did not return a session (status ${response.status}) ${body.slice(0, 200)}`);
  }
  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (!accessToken || !refreshToken) throw new Error("session fragment missing tokens");
  return { userId: user.id, email, accessToken, refreshToken };
}

/** Encodes a minted session the way @supabase/ssr stores it in a cookie. */
export function encodeSessionCookie(session) {
  const payload = JSON.stringify({
    access_token: session.accessToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: session.refreshToken,
    user: { id: session.userId, email: session.email },
  });
  // @supabase/ssr stores the cookie base64url-encoded with a `base64-` prefix
  // when the value does not fit the plain-cookie charset.
  return "base64-" + Buffer.from(payload, "utf8").toString("base64url");
}
