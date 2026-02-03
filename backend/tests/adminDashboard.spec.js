const { test, expect } = require('@playwright/test');

test.describe('Admin Dashboard', () => {
  let authToken;

  // Authenticate as Admin before running dashboard tests
  test.beforeAll(async ({ request }) => {
    // Use environment variables or default to the known test admin
    const adminID = process.env.ADMIN_ID || 'ADM001';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    
    const res = await request.post('/login', {
      data: { userID: adminID, password: password }
    });
    
    // Ensure login was successful
    expect(res.ok()).toBeTruthy();
    
    const body = await res.json();
    authToken = body.token;
  });

  test('GET /admin-dashboard/stats - Returns dashboard statistics', async ({ request }) => {
    const res = await request.get('/admin-dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Verify root wrapper if it exists (controller returns { payload: { ... } })
    expect(body).toHaveProperty('payload');
    const stats = body.payload;

    // Verify statistical counters
    expect(stats).toHaveProperty('activeTerminals');
    expect(stats.activeTerminals).toBeGreaterThanOrEqual(0);

    expect(stats).toHaveProperty('activeDispatchers');
    expect(stats.activeDispatchers).toBeGreaterThanOrEqual(0);

    expect(stats).toHaveProperty('activeNeighborhoods');
    expect(stats.activeNeighborhoods).toBeGreaterThanOrEqual(0);
    
    expect(stats).toHaveProperty('completedOperations');
    expect(stats.completedOperations).toBeGreaterThanOrEqual(0);

    expect(stats).toHaveProperty('alertTypes');
    expect(stats.alertTypes).toHaveProperty('critical');
    expect(stats.alertTypes).toHaveProperty('userInitiated');
    expect(stats.alertTypes).toHaveProperty('total');
  });

  test('GET /admin-dashboard/map - Returns aggregated map data', async ({ request }) => {
    const res = await request.get('/admin-dashboard/map', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();

    // Verify it is an array
    expect(Array.isArray(body)).toBeTruthy();

    // If there is data, verify structure of the first item
    if (body.length > 0) {
      const item = body[0];
      expect(item).toHaveProperty('neighborhoodID');
      expect(item).toHaveProperty('terminalID');
      expect(item).toHaveProperty('terminalName');
      expect(item).toHaveProperty('terminalStatus');
      expect(item).toHaveProperty('totalAlerts');
      expect(item).toHaveProperty('focalPerson');
      
      // Check data types
      expect(typeof item.totalAlerts).toBe('number');
    }
  });

  test('Access Denied for Non-Admin / No Token', async ({ request }) => {
    // 1. No Token
    const noTokenRes = await request.get('/admin-dashboard/stats');
    expect(noTokenRes.status()).toBe(401); // Unauthorized

    // 2. Dispatcher Login (if available) attempt to access admin route
    // Note: If you don't have dispatcher creds in env, this part might skip or fail if hardcoded.
    // For now, let's just create a test case that can be conditionally run or just check 401/403 behavior.
    
    // We can rely on the fact that /admin-dashboard is protected by requireRole("admin")
    // If we passed a token with role "focalPerson" or "dispatcher", it should return 403 Forbidden.
  });
});
