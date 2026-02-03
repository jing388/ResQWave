const { test, expect } = require('@playwright/test');

// Registration Endpoint
test.describe('POST /register', () => {

  test('Successfully registers a new admin', async ({ request }) => {
    const unique = Date.now();

    const res = await request.post('/register', {
      data: {
        name: `Test Admin ${unique}`,
        email: `testadmin${unique}@example.com`,
        password: 'Password123!'
      }
    });

    expect(res.status()).toBe(201);

    const body = await res.json();

    expect(body).toHaveProperty('message', 'Admin Registered Successfully');
    expect(body).toHaveProperty('id');

    // ID format check: ADM###
    expect(body.id).toMatch(/^ADM\d{3}$/);
  });

  test('Fails when required fields are missing', async ({ request }) => {
    const res = await request.post('/register', {
      data: {
        email: 'missingname@example.com'
      }
    });

    expect(res.status()).toBe(400);

    const body = await res.json();
    expect(body.message).toMatch(/required/i);
  });

  test('Fails when admin name or email already exists', async ({ request }) => {
    const unique = Date.now();
    const payload = {
      name: `Duplicate Admin ${unique}`,
      email: `duplicate${unique}@example.com`,
      password: 'Password123!'
    };

    // First registration (should succeed)
    const firstRes = await request.post('/register', {
      data: payload
    });
    expect(firstRes.status()).toBe(201);

    // Second registration (should fail)
    const secondRes = await request.post('/register', {
      data: payload
    });

    expect(secondRes.status()).toBe(400);

    const body = await secondRes.json();
    expect(body.message).toMatch(/already exists/i);
  });

});

// Login Endpoint (Admin/Dispatcher)
test.describe('POST /login (Admin/Dispatcher)', () => {

  test('Successfully logs in Admin with 2FA Bypass (Test Mode)', async ({ request }) => {
    // Ensure you have these set in your .env file
    const adminID = process.env.ADMIN_ID; 
    const password = process.env.ADMIN_PASSWORD;

    const res = await request.post('/login', {
      data: {
        userID: adminID,
        password: password
      }
    });

    // In Test Mode, we expect 200 OK and a Token immediately
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body.user).toHaveProperty('role', 'admin');
    expect(body.message).toContain('Test Mode');
  });

  test('Successfully logs in Dispatcher with 2FA Bypass (Test Mode)', async ({ request }) => {
    // Requires DISPATCHER_ID and DISPATCHER_PASSWORD in .env
    // or fallback to a known test user if you set one up.
    if (!process.env.DISPATCHER_ID || !process.env.DISPATCHER_PASSWORD) {
      test.skip(true, 'Skipping Dispatcher test: Missing DISPATCHER_ID/PASSWORD');
      return;
    }

    const res = await request.post('/login', {
      data: {
        userID: process.env.DISPATCHER_ID,
        password: process.env.DISPATCHER_PASSWORD
      }
    });

    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(body.user).toHaveProperty('role', 'dispatcher'); // Ensure role is correct
    expect(body.message).toContain('Test Mode');
  });

  test('Fails with invalid credentials', async ({ request }) => {
    const res = await request.post('/login', {
      data: {
        userID: 'ADM999999',
        password: 'WrongPassword'
      }
    });

    // 400 Bad Request or 403 Forbidden
    expect([400, 403]).toContain(res.status());
  });
});

// Current User Endpoint
test.describe('GET /me', () => {
  let authToken;

  // Login before running /me tests
  test.beforeAll(async ({ request }) => {
    const adminID = process.env.ADMIN_ID;
    const password = process.env.ADMIN_PASSWORD;
    
    const res = await request.post('/login', {
      data: { userID: adminID, password: password }
    });
    
    if (res.ok()) {
      const body = await res.json();
      authToken = body.token;
    }
  });

  test('Returns user details for valid token', async ({ request }) => {
    test.skip(!authToken, 'Skipping because login failed');

    const res = await request.get('/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('user');
    expect(body.user.role).toBe('admin');
  });

  test('Fails for missing token', async ({ request }) => {
    const res = await request.get('/me');
    expect(res.status()).toBe(401);
  });
});

// Focal Person Login
test.describe('POST /focal/login', () => {
    // Note: This requires a valid Focal Person in the DB.
    // If you don't have a stable test user, this might fail.
    // Assuming FOCAL_EMAIL and FOCAL_PASSWORD exist in env, or using placeholders.
    
    test('Successfully logs in Focal Person with 2FA Bypass', async ({ request }) => {
        // Skip if credentials aren't provided
        if (!process.env.FOCAL_USER || !process.env.FOCAL_PASS) {
             test.skip(true, 'Skipping Focal Person test: FOCAL_USER or FOCAL_PASS not in env');
             return;
        }

        const res = await request.post('/focal/login', {
            data: {
                emailOrNumber: process.env.FOCAL_USER,
                password: process.env.FOCAL_PASS
            }
        });

        // Debug response if it fails
        if (res.status() !== 200) {
            console.log('Focal Login Failed Body:', await res.json());
        }

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('token');
        expect(body.user.role).toBe('focalPerson');
        expect(body.message).toContain('Test Mode');
    });
});

// Logout Endpoint
test.describe('POST /logout', () => {
    let authToken;

    // Login to get a valid token first
    test.beforeAll(async ({ request }) => {
        const adminID = process.env.ADMIN_ID;
        const password = process.env.ADMIN_PASSWORD;
        
        const res = await request.post('/login', {
          data: { userID: adminID, password: password }
        });
        
        if (res.ok()) {
          const body = await res.json();
          authToken = body.token;
        }
    });

    test('Successfully logs out', async ({ request }) => {
        test.skip(!authToken, 'Skipping logout test because login failed');

        const res = await request.post('/logout', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('message', 'Logged Out Succesfully');
    });

    test('Fails logout without token', async ({ request }) => {
        const res = await request.post('/logout');
        // Expect 401 Unauthorized because middleware checks token
        // CatchAsync + UnauthorizedError usually returns 401
        expect(res.status()).toBe(401); 
    });
});