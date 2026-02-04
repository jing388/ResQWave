const { test, expect } = require('@playwright/test');

test.describe('Alert Management', () => {
    let authToken;
    let testTerminalID;
    let createdAlertID;
    let createdUserAlertID;

    test.beforeAll(async ({ request }) => {
        // 1. Admin Login
        const adminID = process.env.ADMIN_ID;
        const password = process.env.ADMIN_PASSWORD;
        const loginRes = await request.post('/login', {
            data: { userID: adminID, password: password }
        });
        expect(loginRes.ok()).toBeTruthy();
        const loginBody = await loginRes.json();
        authToken = loginBody.token;

        // 2. Find a valid Terminal
        const termRes = await request.get('/terminal', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (termRes.ok()) {
            const terminals = await termRes.json();
            const active = terminals.find(t => !t.archived);
            if (active) testTerminalID = active.id;
        }
    });

    // 1. Create Critical Alert
    test('POST /alerts/critical - Create Critical Alert', async ({ request }) => {
        test.skip(!testTerminalID, 'Skipping: No Test Terminal');

        const res = await request.post('/alerts/critical', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                terminalID: testTerminalID,
                alertType: 'Critical',
                sentThrough: 'Sensor'
            }
        });

        expect([200, 201]).toContain(res.status());
        const body = await res.json();
        expect(body).toHaveProperty('alert');
        expect(body.alert).toHaveProperty('id');
        expect(body.alert.alertType).toBe('Critical');
        
        createdAlertID = body.alert.id;
    });

    // 2. Create User-Initiated Alert
    test('POST /alerts/user - Create User-Initiated Alert', async ({ request }) => {
        test.skip(!testTerminalID, 'Skipping: No Test Terminal');

        const res = await request.post('/alerts/user', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                terminalID: testTerminalID,
                sentThrough: 'Button'
            }
        });

        expect([200, 201]).toContain(res.status());
        const body = await res.json();
        expect(body.alert.alertType).toBe('User-Initiated');

        createdUserAlertID = body.alert.id;
    });

    // 3. Get All Alerts
    test('GET /alerts - List all alerts', async ({ request }) => {
        const res = await request.get('/alerts', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBeTruthy();
        
        if (createdAlertID) {
            const alert = body.find(a => a.alertId === createdAlertID);
            expect(alert).toBeTruthy();
        }
    });

    // 4. Get Unassigned Alerts
    test('GET /alerts/unassigned - List unassigned alerts', async ({ request }) => {
        const res = await request.get('/alerts/unassigned', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBeTruthy();

        // Any new alert starts as Unassigned
        if (createdAlertID) {
            const alert = body.find(a => a.alertId === createdAlertID);
            expect(alert).toBeTruthy();
            expect(alert.status).toBe('Unassigned');
        }
    });

    // 5. Get Single Alert
    test('GET /alerts/:id - Get alert details', async ({ request }) => {
        test.skip(!createdAlertID, 'Skipping: No Alert Created');

        const res = await request.get(`/alerts/${createdAlertID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.alertID).toBe(createdAlertID);
    });

    // 6. Update Status (Needs Rescue Form logic, so we expect Failure or Specific Error)
    test('PATCH /alerts/:id - Dispatch fails without Rescue Form', async ({ request }) => {
        test.skip(!createdAlertID, 'Skipping: No Alert Created');

        const res = await request.patch(`/alerts/${createdAlertID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: { action: 'dispatch' }
        });

        // Controller logic says: "Rescue Form must be created before dispatching"
        // So we expect 400 Bad Request
        expect(res.status()).toBe(400);
        const body = await res.json();
        expect(body.message).toMatch(/Rescue Form must be created/i);
    });

    // 7. Error Handling
    test('POST /alerts/critical - Fail without Terminal ID', async ({ request }) => {
        const res = await request.post('/alerts/critical', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: { alertType: 'Critical' }
        });
        expect(res.status()).toBe(400); // BadRequestError
    });
});
