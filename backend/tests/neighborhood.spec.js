const { test, expect } = require('@playwright/test');

test.describe('Neighborhood Management', () => {
    let adminToken;
    let focalToken;
    let neighborhoodID;
    let focalPersonID;
    let terminalID;
    const unique = Date.now();
    const testEmail = `nb.test.${unique}@example.com`;
    const testContact = `0920${String(unique).slice(-7)}`;

    // 1. Setup: Create environment
    test.beforeAll(async ({ request }) => {
        // A. Admin Login
        const adminID = process.env.ADMIN_ID;
        const password = process.env.ADMIN_PASSWORD;
        const loginRes = await request.post('/login', {
            data: { userID: adminID, password: password }
        });
        expect(loginRes.ok()).toBeTruthy();
        adminToken = (await loginRes.json()).token;

        // B. Find Available Terminal
        const termRes = await request.get('/terminal', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const terminals = await termRes.json();
        const available = terminals.find(t => !t.archived && String(t.availability).toLowerCase() !== 'occupied');
        
        if (available) {
            terminalID = available.id;
        } else {
            console.warn('Skipping Neighborhood setup: No terminal available');
            return;
        }

        // C. Create Focal Person (creates Neighborhood)
        const createRes = await request.post('/focalperson', {
            headers: { 'Authorization': `Bearer ${adminToken}` },
            multipart: {
                terminalID: terminalID,
                firstName: 'NBTest',
                lastName: 'Focal',
                email: testEmail,
                contactNumber: testContact,
                address: JSON.stringify({ city: 'TestCity' }),
                noOfHouseholds: '15', // Neighborhood field
                hazards: '["Floods"]' // Neighborhood field
            }
        });

        if (createRes.ok()) {
            const body = await createRes.json();
            neighborhoodID = body.newNeighborhoodID;
            focalPersonID = body.newFocalID;

            // D. Login as Focal (Password change necessary usually, but tests might use bypass if implemented, 
            // otherwise use admin to reset password first)
            await request.put(`/focalperson/${focalPersonID}/changePassword`, {
                headers: { 'Authorization': `Bearer ${adminToken}` },
                data: { newPassword: 'NBTestPass123!' }
            });

            const focalLogin = await request.post('/focal/login', {
                data: { emailOrNumber: testEmail, password: 'NBTestPass123!' }
            });
            if (focalLogin.ok()) {
                focalToken = (await focalLogin.json()).token;
            }
        }
    });

    test('GET /neighborhood - List Active', async ({ request }) => {
        test.skip(!neighborhoodID, 'Setup failed');
        const res = await request.get('/neighborhood', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        expect(res.status()).toBe(200);
        const list = await res.json();
        const found = list.find(n => n.neighborhoodID === neighborhoodID);
        expect(found).toBeTruthy();
    });

    test('GET /neighborhood/:id - Details', async ({ request }) => {
        test.skip(!neighborhoodID, 'Setup failed');
        const res = await request.get(`/neighborhood/${neighborhoodID}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.id).toBe(neighborhoodID);
        expect(body.noOfHouseholds).toBe('15');
        // Hazards comes back as array
        expect(body.hazards).toContain('Floods');
    });

    test('PUT /neighborhood/:id - Update Information', async ({ request }) => {
        test.skip(!neighborhoodID, 'Setup failed');
        const res = await request.put(`/neighborhood/${neighborhoodID}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` },
            data: {
                noOfHouseholds: '20',
                hazards: '["Floods", "Landslide"]',
                otherInformation: 'Updated info'
            }
        });
        expect(res.status()).toBe(200);

        // Verify
        const check = await request.get(`/neighborhood/${neighborhoodID}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const body = await check.json();
        expect(body.noOfHouseholds).toBe('20');
        expect(body.hazards).toContain('Landslide');
    });

    test('Focal: GET /neighborhood/own', async ({ request }) => {
        test.skip(!focalToken || !neighborhoodID, 'Setup/Login failed');
        const res = await request.get('/neighborhood/own', {
            headers: { 'Authorization': `Bearer ${focalToken}` }
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.neighborhoodID).toBe(neighborhoodID);
    });

    test('DELETE /neighborhood/:id - Archive', async ({ request }) => {
        test.skip(!neighborhoodID, 'Setup failed');
        const res = await request.delete(`/neighborhood/${neighborhoodID}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        expect(res.status()).toBe(200);

        // Verify it's gone from active list
        const listRes = await request.get('/neighborhood', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const list = await listRes.json();
        expect(list.find(n => n.neighborhoodID === neighborhoodID)).toBeUndefined();
    });

    test('GET /neighborhood/archived - Verify Archived', async ({ request }) => {
        test.skip(!neighborhoodID, 'Setup failed');
        const res = await request.get('/neighborhood/archived', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        expect(res.status()).toBe(200);
        const list = await res.json();
        // Controller returns "neighborhoodID" NOT "id" (based on code lines 892-902)
        expect(list.find(n => n.neighborhoodID === neighborhoodID)).toBeDefined();
    });

    test('PATCH /neighborhood/:id/restore - Restore', async ({ request }) => {
        test.skip(!neighborhoodID || !terminalID, 'Setup failed');
        
        // Restore requires a valid Terminal ID because archiving unlinked it.
        const res = await request.patch(`/neighborhood/${neighborhoodID}/restore`, {
            headers: { 'Authorization': `Bearer ${adminToken}` },
            data: { terminalID: terminalID } // Must provide a terminal since archiving freed it
        });

        // Debug response if failed
        if (res.status() !== 200) {
            console.log('Restore Failed:', await res.json());
        }

        expect(res.status()).toBe(200);


        // Verify back in active
        const listRes = await request.get('/neighborhood', {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const list = await listRes.json();
        expect(list.find(n => n.neighborhoodID === neighborhoodID)).toBeDefined();
    });

    test('DELETE /neighborhood/:id/permanent - Permanent Delete', async ({ request }) => {
        test.skip(!neighborhoodID, 'Setup failed');
        
        // Must archive first usually, but let's try direct delete? 
        // Based on typical logic, it might require archive state.
        // Let's archive it again first to be safe and test the "delete archived" flow which is standard.
        await request.delete(`/neighborhood/${neighborhoodID}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        const res = await request.delete(`/neighborhood/${neighborhoodID}/permanent`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        expect(res.status()).toBe(200);

        // Verify completely gone
        const check = await request.get(`/neighborhood/${neighborhoodID}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        expect(check.status()).toBe(404);
    });

});
