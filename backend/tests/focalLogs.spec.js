const { test, expect } = require('@playwright/test');

test.describe('Focal Person Logs', () => {
    let adminToken;
    let focalToken;
    let createdFocalID;
    const unique = Date.now();
    const testEmail = `focalable.logs.${unique}@example.com`;

    // 1. Setup: Create Focal Person via Admin
    test.beforeAll(async ({ request }) => {
        // Admin Login
        const adminID = process.env.ADMIN_ID;
        const password = process.env.ADMIN_PASSWORD;
        const loginRes = await request.post('/login', {
            data: { userID: adminID, password: password }
        });
        expect(loginRes.ok()).toBeTruthy();
        adminToken = (await loginRes.json()).token;

        // Get Available Terminal
        const termRes = await request.get('/terminal', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const terminals = await termRes.json();
        const terminalID = terminals.find(t => !t.archived && String(t.availability).toLowerCase() !== 'occupied')?.id;

        if (!terminalID) {
            console.warn('Skipping Focal Logs setup: No terminal available');
            return;
        }

        // Create Focal Person
        const createRes = await request.post('/focalperson', {
            headers: { 'Authorization': `Bearer ${adminToken}` },
            multipart: {
                terminalID: terminalID,
                firstName: 'Log',
                lastName: 'Tester',
                email: testEmail,
                contactNumber: `0922${String(unique).slice(-7)}`,
                address: JSON.stringify({ city: 'LogCity' })
            }
        });
        
        if (createRes.ok()) {
            createdFocalID = (await createRes.json()).newFocalID;

            // Change Password to login
            await request.put(`/focalperson/${createdFocalID}/changePassword`, {
                headers: { 'Authorization': `Bearer ${adminToken}` },
                data: { newPassword: 'TestLogPassword1!' }
            });

            // Login as Focal Person
            const focalLoginRes = await request.post('/focal/login', {
                data: { emailOrNumber: testEmail, password: 'TestLogPassword1!' }
            });
            
            if (focalLoginRes.ok()) {
                focalToken = (await focalLoginRes.json()).token;
            }
        }
    });

    // 2. Generate Log (Update Profile)
    test('Generate Log Entry', async ({ request }) => {
        test.skip(!focalToken, 'Skipping: No Focal Token');

        // Update profile to generate a log
        const res = await request.put(`/focalperson/${createdFocalID}`, {
            headers: { 'Authorization': `Bearer ${focalToken}` }, // Focal updating self
            data: { firstName: 'UpdatedLogName' }
        });
        expect(res.status()).toBe(200);
    });

    // 3. Get Own Logs
    test('GET /logs/own - Retrieve Logs', async ({ request }) => {
        test.skip(!focalToken, 'Skipping: No Focal Token');

        const res = await request.get('/logs/own', {
            headers: { 'Authorization': `Bearer ${focalToken}` }
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        
        expect(body).toHaveProperty('days');
        expect(Array.isArray(body.days)).toBeTruthy();
        
        // If the update in previous test worked, we should see logs
        if (body.total > 0) {
            const latestDay = body.days[0];
            const latestAction = latestDay.actions[0];
            expect(latestAction.entityType).toBe('FocalPerson');
            // Check field structure
            expect(latestAction.fields[0]).toHaveProperty('field');
            expect(latestAction.fields[0]).toHaveProperty('oldValue');
            expect(latestAction.fields[0]).toHaveProperty('newValue');
        }
    });
    
    // 4. Unauthorized Access
    test('GET /logs/own - Unauthorized (No Token)', async ({ request }) => {
        const res = await request.get('/logs/own');
        expect(res.status()).toBe(401); 
    });

});
