const { test, expect } = require('@playwright/test');

test.describe('Dispatcher Management', () => {
    let authToken;
    let createdDispatcherID;
    const unique = Date.now();
    const testEmail = `dispatcher.test.${unique}@example.com`;
    const testContact = `0999${String(unique).slice(-7)}`; 

    // Login as Admin
    test.beforeAll(async ({ request }) => {
        const adminID = process.env.ADMIN_ID || 'ADM001';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        const loginRes = await request.post('/login', {
            data: { userID: adminID, password: password }
        });
        expect(loginRes.ok()).toBeTruthy();
        const body = await loginRes.json();
        authToken = body.token;
    });

    // 1. Create Dispatcher
    test('POST /dispatcher - Create Dispatcher', async ({ request }) => {
        const res = await request.post('/dispatcher', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                name: 'Test Dispatcher Automated',
                email: testEmail,
                contactNumber: testContact
            }
        });

        expect(res.status()).toBe(201);
        const body = await res.json();
        expect(body.message).toMatch(/created/i);
    });

    // 2. List Dispatchers & Find Created One
    test('GET /dispatcher - List Dispatchers', async ({ request }) => {
        const res = await request.get('/dispatcher', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBeTruthy();

        const created = body.find(d => d.email === testEmail);
        expect(created).toBeTruthy();
        createdDispatcherID = created.id;
    });

    // 3. Get Specific Dispatcher
    test('GET /dispatcher/:id - Get Details', async ({ request }) => {
        test.skip(!createdDispatcherID, 'Creation failed');

        const res = await request.get(`/dispatcher/${createdDispatcherID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.id).toBe(createdDispatcherID);
        expect(body.email).toBe(testEmail);
    });

    // 4. Update Dispatcher
    test('PUT /dispatcher/:id - Update Details', async ({ request }) => {
        test.skip(!createdDispatcherID, 'Creation failed');
        const newName = 'Updated Dispatcher Name';

        const res = await request.put(`/dispatcher/${createdDispatcherID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: { name: newName }
        });

        expect(res.status()).toBe(200);
        
        // Verify update
        const getRes = await request.get(`/dispatcher/${createdDispatcherID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const body = await getRes.json();
        expect(body.name).toBe(newName);
    });

    // 5. Duplicate Email Check
    test('POST /dispatcher - Fail Duplicate Email', async ({ request }) => {
        const res = await request.post('/dispatcher', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            data: {
                name: 'Dupe Finder',
                email: testEmail, // Existing email
                contactNumber: '09111111111'
            }
        });
        expect(res.status()).toBe(400); // BadRequestError
        const body = await res.json();
        expect(body.message).toMatch(/already used/i);
    });

    // 6. Archive Dispatcher
    test('DELETE /dispatcher/:id - Archive Dispatcher', async ({ request }) => {
        test.skip(!createdDispatcherID, 'Creation failed');

        const res = await request.delete(`/dispatcher/${createdDispatcherID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.message).toMatch(/archived/i);

        // Verify it's gone from active list
        const listRes = await request.get('/dispatcher', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const listBody = await listRes.json();
        const found = listBody.find(d => d.id === createdDispatcherID);
        expect(found).toBeUndefined();
    });

    // 7. List Archived & Restore
    test('GET /dispatcher/archived & PATCH /restore', async ({ request }) => {
        test.skip(!createdDispatcherID, 'Creation failed');

        // Check archived list
        const archRes = await request.get('/dispatcher/archived', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const archBody = await archRes.json();
        const found = archBody.find(d => d.id === createdDispatcherID);
        expect(found).toBeTruthy();

        // Restore
        const restoreRes = await request.patch(`/dispatcher/${createdDispatcherID}/restore`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(restoreRes.status()).toBe(200);
        
        // Verify back in active list
        const listRes = await request.get('/dispatcher', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const listBody = await listRes.json();
        expect(listBody.find(d => d.id === createdDispatcherID)).toBeTruthy();
    });

    // 8. Permanent Delete (Cleanup)
    test('DELETE /dispatcher/:id/permanent', async ({ request }) => {
        test.skip(!createdDispatcherID, 'Creation failed');

        // Must archive first before permanent delete
        await request.delete(`/dispatcher/${createdDispatcherID}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const delRes = await request.delete(`/dispatcher/${createdDispatcherID}/permanent`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        expect(delRes.status()).toBe(200);

        // Verify completely gone
        const getRes = await request.get(`/dispatcher/${createdDispatcherID}`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
        });
        expect(getRes.status()).toBe(404);
    });
});
