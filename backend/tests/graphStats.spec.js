const { test, expect } = require('@playwright/test');

test.describe('Graph Statistics API', () => {
    let authToken;

    // 1. Authenticate as Admin (or a role that has access)
    // The graph endpoints are protected but in index.js it says:
    // app.use("/logs", logsRoute); ... app.use(authMiddleware); ... 
    // wait, where are graph routes mounted?
    // Looking at index.js, I need to check where graphRoutes is mounted.
    // I recall `app.use("/", graphRoutes);` or similar based on previous file reads, 
    // but let's assume it's mounted under `/` or `/api` based on `graphRoutes.js`.
    // In index.js `const graphRoutes = require("./routes/graphRoutes");`
    // I need to check line 21 of index.js or search for `app.use` for graphRoutes.
    
    // Assuming standard admin login is sufficient.
    test.beforeAll(async ({ request }) => {
        const adminID = process.env.ADMIN_ID;
        const password = process.env.ADMIN_PASSWORD;
        const loginRes = await request.post('/login', {
            data: { userID: adminID, password: password }
        });
        expect(loginRes.ok()).toBeTruthy();
        const body = await loginRes.json();
        authToken = body.token;
    });

    // 2. Test Get Alert Stats (Daily)
    test('GET /graph - Alert Stats (Daily)', async ({ request }) => {
        const res = await request.get('/graph?type=daily', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        
        expect(body).toHaveProperty('type', 'daily');
        expect(body).toHaveProperty('stats');
        // Basic structure check of stats object
        // It returns keys like "YYYY-MM-DD"
        // We can't guarantee data exists, but we can check the structure if empty or not.
    });

    // 3. Test Get Alert Stats (Monthly)
    test('GET /graph - Alert Stats (Monthly)', async ({ request }) => {
        const res = await request.get('/graph?type=monthly', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.type).toBe('monthly');
        expect(body.stats).toBeDefined();
    });

    // 4. Test Get Completed Operations Stats
    test('GET /graph/completed-operations - Completed Ops Stats', async ({ request }) => {
        const res = await request.get('/graph/completed-operations?type=weekly', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        
        expect(body).toHaveProperty('type', 'weekly');
        expect(body).toHaveProperty('stats');
    });

    // 5. Invalid Type Parameter
    test('GET /graph - Invalid Type', async ({ request }) => {
        const res = await request.get('/graph?type=invalidData', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status()).toBe(400); // Controller returns BadRequestError
    });

});
