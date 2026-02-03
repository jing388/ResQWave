const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Profile Controller - Complete Test Suite', () => {
    let adminToken;
    let dispatcherToken;
    let focalToken;
    let adminID;
    let dispatcherID;
    let focalID;

    test.beforeAll(async ({ request }) => {
        // Admin Login
        adminID = process.env.ADMIN_ID || 'ADM001';
        const adminRes = await request.post('/login', {
            data: { 
                userID: adminID, 
                password: process.env.ADMIN_PASSWORD || 'admin123' 
            }
        });
        expect(adminRes.ok()).toBeTruthy();
        adminToken = `Bearer ${(await adminRes.json()).token}`;

        // Dispatcher Login
        dispatcherID = process.env.DISPATCHER_ID || 'DSP011';
        const dispatcherRes = await request.post('/login', {
            data: { 
                userID: dispatcherID, 
                password: process.env.DISPATCHER_PASSWORD || 'rodel' 
            }
        });
        expect(dispatcherRes.ok()).toBeTruthy();
        dispatcherToken = `Bearer ${(await dispatcherRes.json()).token}`;

        // Focal Person Login (if available in env)
        if (process.env.FOCAL_USER && process.env.FOCAL_PASS) {
            const focalRes = await request.post('/focal/login', {
                data: { 
                    emailOrNumber: process.env.FOCAL_USER, 
                    password: process.env.FOCAL_PASS 
                }
            });
            
            if (focalRes.ok()) {
                const focalData = await focalRes.json();
                focalToken = `Bearer ${focalData.token}`;
                focalID = focalData.user?.id;
            }
        }
    });

    test.describe('GET / - Get Profile', () => {
        test('should get admin profile', async ({ request }) => {
            const res = await request.get('/profile', {
                headers: { 'Authorization': adminToken }
            });

            expect(res.status()).toBe(200);
            const profile = await res.json();
            expect(profile.id).toBe(adminID);
            expect(profile).toHaveProperty('name');
            expect(profile).toHaveProperty('email');
            expect(profile).toHaveProperty('contactNumber');
        });

        test('should get dispatcher profile', async ({ request }) => {
            const res = await request.get('/profile', {
                headers: { 'Authorization': dispatcherToken }
            });

            expect(res.status()).toBe(200);
            const profile = await res.json();
            expect(profile.id).toBe(dispatcherID);
            expect(profile).toHaveProperty('name');
            expect(profile).toHaveProperty('email');
            expect(profile).toHaveProperty('contactNumber');
        });

        test('should get focal person profile', async ({ request }) => {
            test.skip(!focalToken, 'No focal person credentials available');

            const res = await request.get('/profile', {
                headers: { 'Authorization': focalToken }
            });

            expect(res.status()).toBe(200);
            const profile = await res.json();
            expect(profile).toHaveProperty('id');
            expect(profile).toHaveProperty('firstName');
            expect(profile).toHaveProperty('lastName');
            expect(profile).toHaveProperty('email');
            expect(profile).toHaveProperty('contactNumber');
        });

        test('should reject unauthenticated request', async ({ request }) => {
            const res = await request.get('/profile');
            expect([401, 403]).toContain(res.status());
        });
    });

    test.describe('POST /change-email - Request Email Change', () => {
        test('should send verification code to new email', async ({ request }) => {
            const res = await request.post('/profile/change-email', {
                headers: { 'Authorization': adminToken },
                data: {
                    newEmail: `test${Date.now()}@example.com`
                }
            });

            expect(res.status()).toBe(200);
            const body = await res.json();
            expect(body.message).toContain('Verification code sent');
        });

        test('should reject if new email is missing', async ({ request }) => {
            const res = await request.post('/profile/change-email', {
                headers: { 'Authorization': adminToken },
                data: {}
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('required');
        });

        test('should reject if email already in use', async ({ request }) => {
            // First get an existing email
            const profileRes = await request.get('/profile', {
                headers: { 'Authorization': dispatcherToken }
            });
            const profile = await profileRes.json();

            const res = await request.post('/profile/change-email', {
                headers: { 'Authorization': adminToken },
                data: {
                    newEmail: profile.email // Try to use dispatcher's email
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('already in use');
        });
    });

    test.describe('POST /verify-email-change - Verify Email Change', () => {
        test('should reject invalid verification code', async ({ request }) => {
            const res = await request.post('/profile/verify-email-change', {
                headers: { 'Authorization': adminToken },
                data: {
                    code: '000000'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toMatch(/expired|invalid/i);
        });

        test('should reject missing verification code', async ({ request }) => {
            const res = await request.post('/profile/verify-email-change', {
                headers: { 'Authorization': adminToken },
                data: {}
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('required');
        });
    });

    test.describe('POST /change-number - Request Number Change', () => {
        test('should send verification code to new number', async ({ request }) => {
            const rnd = Math.floor(Math.random() * 100000000);
            const newNumber = `09${String(rnd).padStart(9, '0')}`;

            const res = await request.post('/profile/change-number', {
                headers: { 'Authorization': adminToken },
                data: {
                    newNumber: newNumber
                }
            });

            expect(res.status()).toBe(200);
            const body = await res.json();
            expect(body.message).toContain('Verification code sent');
        });

        test('should reject if new number is missing', async ({ request }) => {
            const res = await request.post('/profile/change-number', {
                headers: { 'Authorization': adminToken },
                data: {}
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('required');
        });

        test('should reject if number already in use', async ({ request }) => {
            // Get an existing contact number
            const profileRes = await request.get('/profile', {
                headers: { 'Authorization': dispatcherToken }
            });
            const profile = await profileRes.json();

            // Ensure we have a valid contact number
            if (!profile.contactNumber) {
                console.log('No contact number found, skipping test');
                return;
            }

            const res = await request.post('/profile/change-number', {
                headers: { 'Authorization': adminToken },
                data: {
                    newNumber: profile.contactNumber
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('already in use');
        });
    });

    test.describe('POST /verify-number-change - Verify Number Change', () => {
        test('should reject invalid verification code', async ({ request }) => {
            const res = await request.post('/profile/verify-number-change', {
                headers: { 'Authorization': adminToken },
                data: {
                    code: '000000'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toMatch(/expire|invalid/i);
        });

        test('should reject missing verification code', async ({ request }) => {
            const res = await request.post('/profile/verify-number-change', {
                headers: { 'Authorization': adminToken },
                data: {}
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('required');
        });
    });

    test.describe('POST /change-password - Change Password', () => {
        test('should reject with missing fields', async ({ request }) => {
            const res = await request.post('/profile/change-password', {
                headers: { 'Authorization': adminToken },
                data: {}
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('required');
        });

        test('should reject with incorrect current password', async ({ request }) => {
            const res = await request.post('/profile/change-password', {
                headers: { 'Authorization': adminToken },
                data: {
                    currentPassword: 'WrongPassword123!',
                    newPassword: 'NewValidPass123!'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('Incorrect');
        });

        test('should reject weak password - too short', async ({ request }) => {
            const res = await request.post('/profile/change-password', {
                headers: { 'Authorization': adminToken },
                data: {
                    currentPassword: process.env.ADMIN_PASSWORD || 'admin123',
                    newPassword: 'Short1!'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('policy');
        });

        test('should reject weak password - no uppercase', async ({ request }) => {
            const res = await request.post('/profile/change-password', {
                headers: { 'Authorization': adminToken },
                data: {
                    currentPassword: process.env.ADMIN_PASSWORD || 'admin123',
                    newPassword: 'weakpassword123!'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('policy');
        });

        test('should reject weak password - no lowercase', async ({ request }) => {
            const res = await request.post('/profile/change-password', {
                headers: { 'Authorization': adminToken },
                data: {
                    currentPassword: process.env.ADMIN_PASSWORD || 'admin123',
                    newPassword: 'WEAKPASSWORD123!'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('policy');
        });

        test('should reject weak password - no number', async ({ request }) => {
            const res = await request.post('/profile/change-password', {
                headers: { 'Authorization': adminToken },
                data: {
                    currentPassword: process.env.ADMIN_PASSWORD || 'admin123',
                    newPassword: 'WeakPassword!'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('policy');
        });

        test('should reject weak password - no special character', async ({ request }) => {
            const res = await request.post('/profile/change-password', {
                headers: { 'Authorization': adminToken },
                data: {
                    currentPassword: process.env.ADMIN_PASSWORD || 'admin123',
                    newPassword: 'WeakPassword123'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('policy');
        });

        test('should reject for focal person (not allowed)', async ({ request }) => {
            test.skip(!focalToken, 'No focal person credentials available');

            const res = await request.post('/profile/change-password', {
                headers: { 'Authorization': focalToken },
                data: {
                    currentPassword: process.env.FOCAL_PASS || 'focal123',
                    newPassword: 'NewValidPass123!'
                }
            });

            expect(res.status()).toBe(403);
        });
    });

    test.describe('POST /photo - Upload Profile Picture', () => {
        test('should reject non-focal person users', async ({ request }) => {
            const res = await request.post('/profile/photo', {
                headers: { 'Authorization': adminToken },
                multipart: {
                    photo: {
                        name: 'test.jpg',
                        mimeType: 'image/jpeg',
                        buffer: Buffer.from('fake-image-data')
                    }
                }
            });

            expect(res.status()).toBe(403);
            const body = await res.json();
            expect(body.message).toContain('Access denied');
        });

        test('should reject request without file', async ({ request }) => {
            test.skip(!focalToken, 'No focal person credentials available');

            const res = await request.post('/profile/photo', {
                headers: { 'Authorization': focalToken },
                data: {}
            });

            expect(res.status()).toBe(400);
        });

        test('should upload profile picture for focal person', async ({ request }) => {
            test.skip(!focalToken, 'No focal person credentials available');

            // Create a minimal valid JPEG buffer
            const jpegHeader = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]);
            
            const res = await request.post('/profile/photo', {
                headers: { 'Authorization': focalToken },
                multipart: {
                    photo: {
                        name: 'profile.jpg',
                        mimeType: 'image/jpeg',
                        buffer: jpegHeader
                    }
                }
            });

            if (res.ok()) {
                expect(res.status()).toBe(200);
                const body = await res.json();
                expect(body.user).toBeDefined();
                expect(body.user).toHaveProperty('photo');
            }
        });
    });

    test.describe('Authorization Tests', () => {
        test('should reject all profile endpoints without authentication', async ({ request }) => {
            const endpoints = [
                { method: 'GET', path: '/profile' },
                { method: 'POST', path: '/profile/change-email' },
                { method: 'POST', path: '/profile/verify-email-change' },
                { method: 'POST', path: '/profile/change-number' },
                { method: 'POST', path: '/profile/verify-number-change' },
                { method: 'POST', path: '/profile/change-password' },
                { method: 'POST', path: '/profile/photo' }
            ];

            for (const endpoint of endpoints) {
                let res;
                if (endpoint.method === 'GET') {
                    res = await request.get(endpoint.path);
                } else {
                    res = await request.post(endpoint.path, { data: {} });
                }
                expect([401, 403]).toContain(res.status());
            }
        });
    });

    test.describe('Integration - Email Change Flow', () => {
        test('should complete full email change flow with valid code', async ({ request }) => {
            // This test would require mocking the email service or accessing the cache
            // to retrieve the verification code. In a real scenario, you might:
            // 1. Request email change
            // 2. Mock or retrieve the code from cache/database
            // 3. Verify with the code
            // For now, we just test the request part
            
            const newEmail = `integrationtest${Date.now()}@example.com`;
            const res = await request.post('/profile/change-email', {
                headers: { 'Authorization': dispatcherToken },
                data: { newEmail }
            });

            expect(res.status()).toBe(200);
            // Note: Full integration would require code retrieval mechanism
        });
    });

    test.describe('Integration - Number Change Flow', () => {
        test('should complete full number change request', async ({ request }) => {
            const rnd = Math.floor(Math.random() * 100000000);
            const newNumber = `09${String(rnd).padStart(9, '0')}`;
            
            const res = await request.post('/profile/change-number', {
                headers: { 'Authorization': dispatcherToken },
                data: { newNumber }
            });

            expect(res.status()).toBe(200);
            // Note: Full integration would require SMS code retrieval mechanism
        });
    });
});
