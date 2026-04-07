// Central API client with auth header injection, token refresh, and 401 handling.

type TokenStore = {
  getToken: () => string | null;
  setToken: (token: string) => void;
  onUnauthorized: () => void;
};

let store: TokenStore | null = null;

export function configureApiClient(s: TokenStore) {
  store = s;
}

function getTokenExpiry(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000;
  } catch {
    return 0;
  }
}

async function refreshToken(currentToken: string): Promise<string | null> {
  try {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = store?.getToken() ?? null;

  // Silently refresh if token expires within 24 hours
  if (token) {
    const expiry = getTokenExpiry(token);
    const msUntilExpiry = expiry - Date.now();
    if (msUntilExpiry > 0 && msUntilExpiry < 24 * 60 * 60 * 1000) {
      const newToken = await refreshToken(token);
      if (newToken && store) {
        store.setToken(newToken);
      }
    }
  }

  const activeToken = store?.getToken() ?? null;
  const headers = new Headers(init.headers);
  if (activeToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${activeToken}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401) {
    store?.onUnauthorized();
  }

  return response;
}
