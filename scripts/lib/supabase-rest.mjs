// Minimal PostgREST / GoTrue client for the loader scripts. Deliberately uses
// the same password-grant + REST shape as e2e/fixtures/auth.ts rather than the
// supabase-js client, so the scripts run on plain Node with no build step and
// every write goes through the same public API an admin's browser would use.

export function projectUrl(ref) {
  return `https://${ref}.supabase.co`;
}

export function requireEnv(name, hint) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required${hint ? ` (${hint})` : ""}`);
  return value;
}

export async function signIn(url, anonKey, username, password) {
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: `${username}@bhw.local`, password }),
  });
  const body = await response.json();
  if (!body.access_token) {
    throw new Error(`sign-in failed for ${username}: ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

export function createClient(url, anonKey, accessToken) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  async function request(method, path, { body, prefer } = {}) {
    const response = await fetch(`${url}/rest/v1/${path}`, {
      method,
      headers: prefer ? { ...headers, Prefer: prefer } : headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${method} ${path} -> ${response.status}: ${text}`);
    }
    return text ? JSON.parse(text) : null;
  }

  return {
    get: (path) => request("GET", path),
    insert: (table, rows) =>
      request("POST", table, { body: rows, prefer: "return=representation" }),
    // Direct column write, for fields the RPCs don't cover. kb_entries'
    // admin-write RLS policy is `for all`, so an admin token can PATCH it
    // without widening any RPC signature.
    patch: (path, body) => request("PATCH", path, { body }),
    rpc: (name, args) => request("POST", `rpc/${name}`, { body: args }),
  };
}

// PostgREST caps a plain select at 1000 rows; the corpus is smaller than that
// today but paging keeps the scripts correct as it grows.
export async function selectAll(client, table, columns) {
  const pageSize = 1000;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await client.get(
      `${table}?select=${columns}&limit=${pageSize}&offset=${offset}&order=id`,
    );
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
