const { test, expect } = require('@playwright/test');

test.describe('Focal Person Management', () => {
    let authToken;
    let testTerminalID;
    let createdFocalID;
    const unique = Date.now();
    const testEmail = `focal.test.${unique}@example.com`;
    const testContact = `0988${String(unique).slice(-7)}`;

    // 1. Admin Login & Get Available Terminal
    test.beforeAll(async ({ request }) => {
        const adminID = process.env.ADMIN_ID;
        const password = process.env.ADMIN_PASSWORD;
        const loginRes = await request.post('/login', {
            data: { userID: adminID, password: password }
        });
        expect(loginRes.ok()).toBeTruthy();
        const body = await loginRes.json();
        authToken = body.token;

        // Find available terminal
        const termRes = await request.get('/terminal', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (termRes.ok()) {
            const terminals = await termRes.json();
            // Find one that is NOT archived and NOT occupied
            const available = terminals.find(t => 
                !t.archived && String(t.availability).toLowerCase() !== 'occupied'
            );
            if (available) testTerminalID = available.id;
        }
    });

    // 2. Create Focal Person (Normal Flow)
    test('POST /focalperson - Create Focal Person', async ({ request }) => {
        test.skip(!testTerminalID, 'Skipping: No Available Terminal Found');

        const res = await request.post('/focalperson', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            multipart: {
                terminalID: testTerminalID,
                firstName: 'TestFocal',
                lastName: 'Automated',
                email: testEmail,
                contactNumber: testContact,
                address: JSON.stringify({ street: '123 Test Lane', city: 'Test City' }),
                // Optional fields
                noOfHouseholds: '10',
                noOfResidents: '50',
                floodSubsideHours: '2',
                hazards: '["flood", "wind"]'
            }
        });

        // Debug if fails
        if (res.status() !== 201) {
            console.log('Create Focal Failed:', await res.json());
        }

        expect(res.status()).toBe(201);
        const body = await res.json();
        expect(body).toHaveProperty('newFocalID');
        expect(body).toHaveProperty('newNeighborhoodID');
        
        createdFocalID = body.newFocalID;
    });

    // 3. List & Retrieve
    test('GET /focalperson - List & Get Details', async ({ request }) => {
        const listRes = await request.get('/focalperson', {
             headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(listRes.status()).toBe(200);
        const listBody = await listRes.json();
        const found = listBody.find(f => f.email === testEmail);
        expect(found).toBeTruthy();
        if(!createdFocalID && found) createdFocalID = found.id;

        test.skip(!createdFocalID, 'Creation failed');
        
        const detailRes = await request.get(`/focalperson/${createdFocalID}`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(detailRes.status()).toBe(200);
        const detailBody = await detailRes.json();
        expect(detailBody.email).toBe(testEmail);
    });

    // 4. Update Focal Person
    test('PUT /focalperson/:id - Update Info', async ({ request }) => {
        test.skip(!createdFocalID, 'Creation failed');
        const newFirstName = 'UpdatedFocalFirst';

        const res = await request.put(`/focalperson/${createdFocalID}`, {
             headers: { 'Authorization': `Bearer ${authToken}` },
             data: { firstName: newFirstName }
        });

        expect(res.status()).toBe(200);
        
        const verifyRes = await request.get(`/focalperson/${createdFocalID}`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const body = await verifyRes.json();
        expect(body.firstName).toBe(newFirstName); 
    });

    // 5. Fail Duplicate Email
    test('POST /focalperson - Fail Duplicate Email', async ({ request }) => {
        test.skip(!testTerminalID, 'Skipping: No Terminal');

        const res = await request.post('/focalperson', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            multipart: {
                terminalID: testTerminalID, 
                firstName: 'Dupe',
                lastName: 'Test',
                email: testEmail, // reused
                contactNumber: '09999999999',
                address: 'Simple Address string'
            }
        });

        if (res.status() === 201) {
            console.log('Duplicate Email Test Failed - Created User:', await res.json());
        }

        expect([400, 409]).toContain(res.status());
    });

    // 6. Complete Onboarding
    test('POST /focalperson/complete-onboarding', async ({ request }) => {
        // 1. Change password so we can login (since we don't have the temporary one from email)
        test.skip(!createdFocalID, 'Creation failed - cannot continue');
        const newPassword = 'TestPassword123!';
        
        const changePwRes = await request.put(`/focalperson/${createdFocalID}/changePassword`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: { newPassword: newPassword }
        });
        expect(changePwRes.status()).toBe(200);

        // 2. Login as Focal Person
        const loginRes = await request.post('/focal/login', {
            data: { emailOrNumber: testEmail, password: newPassword }
        });
        expect(loginRes.status()).toBe(200); // Should succeed with Test Mode Bypass
        const loginBody = await loginRes.json();
        const focalToken = loginBody.token;
        expect(focalToken).toBeDefined();

        // 3. Complete Onboarding
        const onboardRes = await request.post('/focalperson/complete-onboarding', {
            headers: { 'Authorization': `Bearer ${focalToken}` }
        });

        expect(onboardRes.status()).toBe(200);
        const onboardBody = await onboardRes.json();
        expect(onboardBody.newUser).toBe(false);

        // 4. Verify in DB (via Get)
        const checkRes = await request.get(`/focalperson/${createdFocalID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const focalData = await checkRes.json();
        // Since API doesn't usually expose "newUser" flag directly in public view, 
        // we rely on the response from onboardRes. But if it did, we'd check here.
    });

});
