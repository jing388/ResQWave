const { test, expect } = require('@playwright/test');

test.describe('Alarm Management', () => {
    let authToken;
    let testTerminalID;
    let createdAlarmID;

    // Login and find a valid Terminal
    test.beforeAll(async ({ request }) => {
        // 1. Login
        const adminID = process.env.ADMIN_ID;
        const password = process.env.ADMIN_PASSWORD;

        const loginRes = await request.post('/login', {
            data: { userID: adminID, password: password }
        });
        expect(loginRes.ok()).toBeTruthy();
        const loginBody = await loginRes.json();
        authToken = loginBody.token;

        // 2. Find a Terminal to attach alarms to
        const termRes = await request.get('/terminal', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (termRes.ok()) {
            const terminals = await termRes.json();
            // Find first active terminal
            const active = terminals.find(t => !t.archived);
            if (active) {
                testTerminalID = active.id;
                console.log(`Using Terminal ID for tests: ${testTerminalID}`);
            }
        }
    });

    test('POST /alarms - Create a new Alarm', async ({ request }) => {
        test.skip(!testTerminalID, 'Skipping becase no active Terminal found');

        const res = await request.post('/alarms', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                terminalID: testTerminalID,
                name: 'Test Alarm High Water',
                status: 'Active',
                severity: 'High'
            }
        });

        expect(res.status()).toBe(201);
        const body = await res.json();
        expect(body).toHaveProperty('id');
        expect(body.terminalID).toBe(testTerminalID);
        expect(body.name).toBe('Test Alarm High Water');

        createdAlarmID = body.id;
    });

    test('GET /alarms - List all alarms', async ({ request }) => {
        test.skip(!createdAlarmID, 'Skipping because creation failed');

        const res = await request.get('/alarms', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBeTruthy();
        
        // Find our created alarm
        const found = body.find(a => a.id === createdAlarmID);
        expect(found).toBeTruthy();
        expect(found).toHaveProperty('terminalName'); // Joined field
        expect(found).toHaveProperty('severity', 'High');
    });

    test('GET /alarms/:id - Get specific alarm details', async ({ request }) => {
        test.skip(!createdAlarmID, 'Skipping because creation failed');

        const res = await request.get(`/alarms/${createdAlarmID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.id).toBe(createdAlarmID);
        expect(body.name).toBe('Test Alarm High Water');
    });

    test('POST /alarms - Fail with missing fields', async ({ request }) => {
        const res = await request.post('/alarms', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                terminalID: testTerminalID,
                // Missing name, status, severity
            }
        });

        expect(res.status()).toBe(400); // BadRequestError
        const body = await res.json();
        expect(body.message).toMatch(/missing required fields/i);
    });

    test('POST /alarms - Fail with invalid Terminal ID', async ({ request }) => {
        const res = await request.post('/alarms', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                terminalID: 'INVALID_TERM_99999',
                name: 'Bad Terminal Alarm',
                status: 'Active',
                severity: 'Low'
            }
        });

        expect(res.status()).toBe(404); // NotFoundError (Terminal not found)
    });
});
