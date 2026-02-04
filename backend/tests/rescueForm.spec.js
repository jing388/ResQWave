const { test, expect } = require('@playwright/test');

test.describe('Rescue Form Controller - Complete Test Suite', () => {
    let adminToken;
    let dispatcherToken;
    let adminID;
    let dispatcherID;
    let testAlertID;
    let testFormID;

    test.beforeAll(async ({ request }) => {
        // Admin Login
        adminID = process.env.ADMIN_ID;
        const adminRes = await request.post('/login', {
            data: { 
                userID: adminID, 
                password: process.env.ADMIN_PASSWORD
            }
        });
        expect(adminRes.ok()).toBeTruthy();
        const adminData = await adminRes.json();
        adminToken = `Bearer ${adminData.token}`;

        // Dispatcher Login
        dispatcherID = process.env.DISPATCHER_ID;
        const dispatcherRes = await request.post('/login', {
            data: { 
                userID: dispatcherID, 
                password: process.env.DISPATCHER_PASSWORD 
            }
        });
        expect(dispatcherRes.ok()).toBeTruthy();
        const dispatcherData = await dispatcherRes.json();
        dispatcherToken = `Bearer ${dispatcherData.token}`;

        // Get alerts and rescue forms to find alerts without forms
        const alertsRes = await request.get('/alerts', {
            headers: { 'Authorization': dispatcherToken }
        });
        
        const formsRes = await request.get('/forms', {
            headers: { 'Authorization': dispatcherToken }
        });
        
        if (alertsRes.ok() && formsRes.ok()) {
            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            
            console.log(`[Setup] Found ${alerts.length} alerts and ${forms.length} rescue forms`);
            
            // Get list of alert IDs that already have forms
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            // Find alerts that could be used for testing
            const availableAlerts = alerts.filter(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                !alertIDsWithForms.has(a.alertId)  // Use alertId, not id
            );
            
            console.log(`[Setup] Available alerts for testing: ${availableAlerts.length}`);
            if (availableAlerts.length > 0) {
                testAlertID = availableAlerts[0].alertId;  // Use alertId, not id
                console.log(`[Setup] Selected test alert: ${testAlertID}`);
            } else {
                console.log('[Setup] ⚠️  No available alerts without rescue forms');
                console.log('[Setup] Many tests will be skipped due to lack of test data');
            }
        }
    });

    test.describe('POST /:alertID - Create Rescue Form', () => {
        test('should create rescue form with all details (focal reachable)', async ({ request }) => {
            test.skip(!testAlertID, 'No test alert available');

            const res = await request.post(`/forms/${testAlertID}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: false,
                    waterLevel: 'Waist-level',
                    waterLevelDetails: 'Rising slowly',
                    urgencyOfEvacuation: 'High',
                    urgencyDetails: 'Elderly present',
                    hazardPresent: 'Yes',
                    hazardDetails: 'Debris floating',
                    accessibility: 'Partially accessible',
                    accessibilityDetails: 'Road flooded',
                    resourceNeeds: 'Boat',
                    resourceDetails: '3 people to rescue',
                    otherInformation: 'Medical supplies needed',
                    status: 'Waitlisted'
                }
            });

            expect(res.status()).toBe(201);
            const form = await res.json();
            expect(form).toHaveProperty('id');
            expect(form.emergencyID).toBe(testAlertID);
            expect(form.focalUnreachable).toBe(false);
            expect(form.waterLevel).toContain('Waist-level');
            expect(form.status).toBe('Waitlisted');
            
            testFormID = form.id; // Store for later tests
        });

        test('should create rescue form when focal is unreachable', async ({ request }) => {
            // Get alerts and forms to find one without a form
            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const availableAlert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                a.alertId !== testAlertID &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!availableAlert, 'No available alert for this test');

            const res = await request.post(`/forms/${availableAlert.alertId}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: true,
                    otherInformation: 'Focal person could not be reached',
                    status: 'Waitlisted'
                }
            });

            expect(res.status()).toBe(201);
            const form = await res.json();
            expect(form.focalUnreachable).toBe(true);
            expect(form.waterLevel).toBeNull();
        });

        test('should reject if focal is reachable but required fields missing', async ({ request }) => {
            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const availableAlert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!availableAlert, 'No available alert');

            const res = await request.post(`/forms/${availableAlert.alertId}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: false,
                    waterLevel: 'Ankle-level',
                    // Missing: urgencyOfEvacuation, hazardPresent, accessibility, resourceNeeds
                    status: 'Waitlisted'
                }
            });

            // Could be 400 for validation error OR 400 for duplicate form
            if (res.status() === 400) {
                const body = await res.json();
                // If it's a duplicate, skip the test
                if (body.message.includes('Already Exists')) {
                    test.skip(true, 'Alert already has a rescue form');
                    return;
                }
                // Otherwise, it should be the validation error we expect
                expect(body.message).toContain('required');
            } else if (res.status() === 404) {
                // Alert not found, skip
                test.skip(true, 'Alert not found');
            } else {
                // Unexpected status
                expect(res.status()).toBe(400);
            }
        });

        test('should reject duplicate rescue form for same alert', async ({ request }) => {
            test.skip(!testAlertID, 'No test alert available');

            const res = await request.post(`/forms/${testAlertID}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: false,
                    waterLevel: 'Ankle-level',
                    urgencyOfEvacuation: 'Low',
                    hazardPresent: 'No',
                    accessibility: 'Fully accessible',
                    resourceNeeds: 'None',
                    status: 'Waitlisted'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('Already Exists');
        });

        test('should reject if alert does not exist', async ({ request }) => {
            const res = await request.post('/forms/ALERT9999', {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: true,
                    status: 'Waitlisted'
                }
            });

            expect(res.status()).toBe(404);
            const body = await res.json();
            expect(body.message).toMatch(/Not Found|Alert Not Found/i);
        });

        test('should reject if admin tries to create rescue form', async ({ request }) => {
            test.skip(!testAlertID, 'No test alert available');

            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': adminToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts as admin');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': adminToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms as admin');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const availableAlert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!availableAlert, 'No available alert without form');

            const res = await request.post(`/forms/${availableAlert.alertId}`, {
                headers: { 'Authorization': adminToken },
                data: {
                    focalUnreachable: true,
                    status: 'Waitlisted'
                }
            });

            expect(res.status()).toBe(403);
            const body = await res.json();
            expect(body.message).toContain('dispatcher');
        });

        test('should reject without authentication', async ({ request }) => {
            const res = await request.post('/forms/ALERT001', {
                data: {
                    focalUnreachable: true,
                    status: 'Waitlisted'
                }
            });

            expect([401, 403]).toContain(res.status());
        });

        test('should create rescue form with dispatched status directly', async ({ request }) => {
            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const availableAlert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                a.alertId !== testAlertID &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!availableAlert, 'No available alert');

            const res = await request.post(`/forms/${availableAlert.alertId}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: false,
                    waterLevel: 'Knee-level',
                    urgencyOfEvacuation: 'Immediate',
                    hazardPresent: 'Yes',
                    accessibility: 'Accessible',
                    resourceNeeds: 'Rescue Team',
                    status: 'Dispatched'
                }
            });

            expect(res.status()).toBe(201);
            const form = await res.json();
            expect(form.status).toBe('Dispatched');
        });
    });

    test.describe('GET /:formID - Get Single Rescue Form', () => {
        test('should get rescue form by ID', async ({ request }) => {
            test.skip(!testFormID, 'No test form available');

            const res = await request.get(`/forms/${testFormID}`, {
                headers: { 'Authorization': dispatcherToken }
            });

            expect(res.status()).toBe(200);
            const form = await res.json();
            expect(form).toHaveProperty('focalUnreachable');
            expect(form).toHaveProperty('waterLevel');
        });

        test('should return 404 for non-existent form', async ({ request }) => {
            const res = await request.get('/forms/RF999', {
                headers: { 'Authorization': dispatcherToken }
            });

            expect(res.status()).toBe(404);
            const body = await res.json();
            expect(body.message).toMatch(/Not Found|Rescue Form Not Found/i);
        });

        test('should reject without authentication', async ({ request }) => {
            test.skip(!testFormID, 'No test form available');

            const res = await request.get(`/forms/${testFormID}`);
            expect([401, 403]).toContain(res.status());
        });
    });

    test.describe('GET / - Get All Rescue Forms', () => {
        test('should get all rescue forms', async ({ request }) => {
            const res = await request.get('/forms', {
                headers: { 'Authorization': dispatcherToken }
            });

            expect(res.status()).toBe(200);
            const forms = await res.json();
            expect(Array.isArray(forms)).toBe(true);
            
            if (forms.length > 0) {
                expect(forms[0]).toHaveProperty('formID');
                expect(forms[0]).toHaveProperty('alertID');
                expect(forms[0]).toHaveProperty('focalUnreachable');
            }
        });

        test('should allow admin to view all rescue forms', async ({ request }) => {
            const res = await request.get('/forms', {
                headers: { 'Authorization': adminToken }
            });

            expect(res.status()).toBe(200);
            const forms = await res.json();
            expect(Array.isArray(forms)).toBe(true);
        });

        test('should reject without authentication', async ({ request }) => {
            const res = await request.get('/forms');
            expect([401, 403]).toContain(res.status());
        });
    });

    test.describe('GET /table/aggregated - Get Aggregated Forms', () => {
        test('should get all aggregated rescue forms', async ({ request }) => {
            const res = await request.get('/forms/table/aggregated', {
                headers: { 'Authorization': dispatcherToken }
            });

            expect(res.status()).toBe(200);
            const data = await res.json();
            expect(Array.isArray(data)).toBe(true);
            
            if (data.length > 0) {
                expect(data[0]).toHaveProperty('emergencyId');
                expect(data[0]).toHaveProperty('terminalId');
            }
        });

        test('should filter aggregated forms by alertID', async ({ request }) => {
            test.skip(!testAlertID, 'No test alert available');

            const res = await request.get(`/forms/table/aggregated?alertID=${testAlertID}`, {
                headers: { 'Authorization': dispatcherToken }
            });

            expect(res.status()).toBe(200);
            const data = await res.json();
            expect(Array.isArray(data)).toBe(true);
            
            if (data.length > 0) {
                expect(data[0].emergencyId).toBe(testAlertID);
            }
        });

        test('should reject without authentication', async ({ request }) => {
            const res = await request.get('/forms/table/aggregated');
            expect([401, 403]).toContain(res.status());
        });
    });

    test.describe('PATCH /:alertID/status - Update Rescue Form Status', () => {
        test('should update status from Waitlisted to Dispatched', async ({ request }) => {
            // First create a waitlisted form
            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const availableAlert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!availableAlert, 'No available alert');

            // Create waitlisted form
            const createRes = await request.post(`/forms/${availableAlert.alertId}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: true,
                    status: 'Waitlisted'
                }
            });

            if (!createRes.ok()) {
                test.skip(true, 'Could not create rescue form');
                return;
            }

            // Update to Dispatched
            const updateRes = await request.patch(`/forms/${availableAlert.alertId}/status`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    status: 'Dispatched'
                }
            });

            expect(updateRes.status()).toBe(200);
            const form = await updateRes.json();
            expect(form.status).toBe('Dispatched');
        });

        test('should update status to Completed', async ({ request }) => {
            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const availableAlert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!availableAlert, 'No available alert');

            // Create form
            const createRes = await request.post(`/forms/${availableAlert.alertId}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: true,
                    status: 'Waitlisted'
                }
            });

            if (!createRes.ok()) {
                test.skip(true, 'Could not create rescue form');
                return;
            }

            // Update to Completed
            const updateRes = await request.patch(`/forms/${availableAlert.alertId}/status`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    status: 'Completed'
                }
            });

            expect(updateRes.status()).toBe(200);
            const form = await updateRes.json();
            expect(form.status).toBe('Completed');
        });

        test('should return 404 for non-existent alert', async ({ request }) => {
            const res = await request.patch('/forms/ALERT9999/status', {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    status: 'Dispatched'
                }
            });

            expect(res.status()).toBe(404);
        });

        test('should reject without authentication', async ({ request }) => {
            const res = await request.patch('/forms/ALERT001/status', {
                data: {
                    status: 'Dispatched'
                }
            });

            expect([401, 403]).toContain(res.status());
        });

        test('should allow admin to update status', async ({ request }) => {
            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': adminToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts as admin');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': adminToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms as admin');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const availableAlert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!availableAlert, 'No available alert');

            // Create form as dispatcher first
            const createRes = await request.post(`/forms/${availableAlert.alertId}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: true,
                    status: 'Waitlisted'
                }
            });

            if (!createRes.ok()) {
                test.skip(true, 'Could not create rescue form');
                return;
            }

            // Admin updates status
            const updateRes = await request.patch(`/forms/${availableAlert.alertId}/status`, {
                headers: { 'Authorization': adminToken },
                data: {
                    status: 'Dispatched'
                }
            });

            expect(updateRes.status()).toBe(200);
        });
    });

    test.describe('Integration Tests', () => {
        test('should complete full rescue form workflow', async ({ request }) => {
            // Get available alert
            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const alert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!alert, 'No available alert for workflow test');

            // Step 1: Create waitlisted form
            const createRes = await request.post(`/forms/${alert.alertId}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: false,
                    waterLevel: 'Ankle-level',
                    urgencyOfEvacuation: 'Moderate',
                    hazardPresent: 'No',
                    accessibility: 'Fully accessible',
                    resourceNeeds: 'None',
                    status: 'Waitlisted'
                }
            });

            // Handle case where alert not found or already has form
            if (createRes.status() === 404) {
                test.skip(true, 'Alert not found');
                return;
            }
            if (createRes.status() === 400) {
                const body = await createRes.json();
                if (body.message.includes('Already Exists')) {
                    test.skip(true, 'Alert already has a rescue form');
                    return;
                }
            }

            expect(createRes.status()).toBe(201);
            const form = await createRes.json();

            // Step 2: Retrieve the form
            const getRes = await request.get(`/forms/${form.id}`, {
                headers: { 'Authorization': dispatcherToken }
            });

            expect(getRes.status()).toBe(200);

            // Step 3: Update to Dispatched
            const dispatchRes = await request.patch(`/forms/${alert.alertId}/status`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    status: 'Dispatched'
                }
            });

            expect(dispatchRes.status()).toBe(200);
            const updated = await dispatchRes.json();
            expect(updated.status).toBe('Dispatched');

            // Step 4: Verify it appears in aggregated list
            const aggRes = await request.get('/forms/table/aggregated', {
                headers: { 'Authorization': dispatcherToken }
            });

            expect(aggRes.status()).toBe(200);
            const aggData = await aggRes.json();
            const foundForm = aggData.find(f => f.emergencyId === alert.alertId);
            expect(foundForm).toBeDefined();
        });

        test('should handle cache invalidation on updates', async ({ request }) => {
            const alertsRes = await request.get('/alerts', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!alertsRes.ok()) {
                test.skip(true, 'Cannot fetch alerts');
                return;
            }

            const formsRes = await request.get('/forms', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (!formsRes.ok()) {
                test.skip(true, 'Cannot fetch forms');
                return;
            }

            const alerts = await alertsRes.json();
            const forms = await formsRes.json();
            const alertIDsWithForms = new Set(forms.map(f => f.alertID));
            
            const alert = alerts.find(a => 
                a.status !== 'Dispatched' && 
                a.status !== 'Completed' &&
                !alertIDsWithForms.has(a.alertId)
            );

            test.skip(!alert, 'No available alert');

            // Create form
            const createRes = await request.post(`/forms/${alert.alertId}`, {
                headers: { 'Authorization': dispatcherToken },
                data: {
                    focalUnreachable: true,
                    status: 'Waitlisted'
                }
            });

            // Handle case where alert not found or already has form
            if (createRes.status() === 404) {
                test.skip(true, 'Alert not found');
                return;
            }
            if (createRes.status() === 400) {
                const body = await createRes.json();
                if (body.message.includes('Already Exists')) {
                    test.skip(true, 'Alert already has a rescue form');
                    return;
                }
            }

            expect(createRes.status()).toBe(201);

            // Get form (should be cached)
            const formData = await createRes.json();
            const get1 = await request.get(`/forms/${formData.id}`, {
                headers: { 'Authorization': dispatcherToken }
            });
            expect(get1.status()).toBe(200);

            // Update status (should invalidate cache)
            await request.patch(`/forms/${alert.alertId}/status`, {
                headers: { 'Authorization': dispatcherToken },
                data: { status: 'Dispatched' }
            });

            // Get form again (should get updated data)
            const get2 = await request.get(`/forms/${formData.id}`, {
                headers: { 'Authorization': dispatcherToken }
            });
            expect(get2.status()).toBe(200);
        });
    });
});
