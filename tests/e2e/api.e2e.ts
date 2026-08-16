import { describe, it, expect, beforeAll } from 'vitest';

const BASE = process.env.E2E_API_URL || 'http://localhost:5000';

async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  return { status: res.status, body };
}

describe('backend API e2e', () => {
  beforeAll(async () => {
    try {
      const health = await api('/');
      if (health.status !== 200) {
        throw new Error(`API root returned ${health.status}`);
      }
    } catch (error) {
      throw new Error(`Backend is not reachable at ${BASE}. Start it with npm run dev.`);
    }
  });

  it('reports API as operational', async () => {
    const { status, body } = await api('/');
    expect(status).toBe(200);
    expect(body).toMatchObject({ status: 'operational' });
  });

  it('returns public pickup cities', async () => {
    const { status, body } = await api('/api/v1/settings/public');
    expect(status).toBe(200);
    expect(body).toMatchObject({ success: true });
    expect(Array.isArray((body as { data: { pickupCities: unknown } }).data.pickupCities)).toBe(true);
  });

  it('lists public catalog endpoints', async () => {
    const [categories, packages, labs] = await Promise.all([
      api('/api/v1/categories'),
      api('/api/v1/packages'),
      api('/api/v1/labs'),
    ]);
    expect(categories.status).toBe(200);
    expect(packages.status).toBe(200);
    expect(labs.status).toBe(200);
    expect(categories.body).toMatchObject({ success: true });
    expect(packages.body).toMatchObject({ success: true });
    expect(labs.body).toMatchObject({ success: true });
  });

  it('rejects unauthenticated profile and bookings', async () => {
    const me = await api('/api/v1/auth/me');
    const bookings = await api('/api/v1/booking/my');
    expect(me.status).toBe(401);
    expect(bookings.status).toBe(401);
  });

  it('rejects unauthenticated admin settings and report download', async () => {
    const settings = await api('/api/v1/admin/settings');
    const report = await api('/api/v1/booking/000000000000000000000000/report');
    expect(settings.status).toBe(401);
    expect(report.status).toBe(401);
  });

  it('validates login payload', async () => {
    const { status, body } = await api('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({ success: false, message: 'Validation failed' });
  });

  it('rejects unknown login credentials', async () => {
    const { status, body } = await api('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'e2e-unknown@litmus.test',
        password: 'wrong-password',
      }),
    });
    expect(status).toBe(401);
    expect(body).toMatchObject({ success: false, message: 'Invalid credentials' });
  });
});
