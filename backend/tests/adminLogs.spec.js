const { test, expect } = require('@playwright/test');

test.describe('Admin Logs', () => {
    let authToken;

    // Login as Admin
    test.beforeAll(async ({ request }) => {
        const adminID = process.env.ADMIN_ID || 'ADM001';
        const password = process.env.ADMIN_PASSWORD || 'admin123';

        const res = await request.post('/login', {
            data: { userID: adminID, password: password }
        });

        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        authToken = body.token;
    });

    test('GET /admin-logs - Returns logs structure correctly', async ({ request }) => {
        const res = await request.get('/admin-logs', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status()).toBe(200);
        const body = await res.json();

        // Check payload structure
        expect(body).toHaveProperty('total');
        expect(body).toHaveProperty('days');
        expect(body).toHaveProperty('lastUpdated');

        // Check types
        expect(typeof body.total).toBe('number');
        expect(Array.isArray(body.days)).toBeTruthy();

        // If logs exist, check grouping structure
        if (body.days.length > 0) {
            const dayGroup = body.days[0];
            expect(dayGroup).toHaveProperty('date');
            expect(dayGroup).toHaveProperty('count');
            expect(dayGroup).toHaveProperty('actions');
            expect(Array.isArray(dayGroup.actions)).toBeTruthy();

            if (dayGroup.actions.length > 0) {
                const actionItem = dayGroup.actions[0];
                expect(actionItem).toHaveProperty('action');
                expect(actionItem).toHaveProperty('message');
                expect(actionItem).toHaveProperty('time');
                expect(actionItem).toHaveProperty('fields');
            }
        }
    });

    test('GET /admin-logs - Access Forbidden for Non-Admin (Focal Person)', async ({ request }) => {
        if (!process.env.FOCAL_USER || !process.env.FOCAL_PASS) {
            test.skip(true, 'Skipping non-admin check: FOCAL_USER/PASS missing');
            return;
        }

        // Login as Focal Person
        const loginRes = await request.post('/focal/login', {
            data: {
                emailOrNumber: process.env.FOCAL_USER,
                password: process.env.FOCAL_PASS
            }
        });

        // Only proceed if focal login works
        if (loginRes.ok()) {
            const body = await loginRes.json();
            const focalToken = body.token;

            const res = await request.get('/admin-logs', {
                headers: { 'Authorization': `Bearer ${focalToken}` }
            });

            // Expect 403 Forbidden because middleware restricts role to "admin"
            expect(res.status()).toBe(403);
            const errBody = await res.json();
             // The middleware likely returns "You do not have permission..." or similiar
             // The controller throws ForbiddenError "Forbidden. Admin access required."
             expect(errBody).toHaveProperty('message');
        }
    });

    test('GET /admin-logs - Unauthorized without token', async ({ request }) => {
        const res = await request.get('/admin-logs');
        expect(res.status()).toBe(401);
    });
});
