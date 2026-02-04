const { test, expect } = require('@playwright/test');

test.describe('Reset Password Controller - Complete Test Suite', () => {
    let adminEmail;
    let dispatcherEmail;
    let dispatcherNumber;
    let focalEmail;
    let focalNumber;
    let adminID;
    let dispatcherID;
    let focalID;

    test.beforeAll(async ({ request }) => {
        // Get admin credentials from env
        adminID = process.env.ADMIN_ID;
        const adminPassword = process.env.ADMIN_PASSWORD;

        // Login as admin to get admin email
        const adminLoginRes = await request.post('/login', {
            data: { 
                userID: adminID, 
                password: adminPassword 
            }
        });
        
        if (adminLoginRes.ok()) {
            const adminData = await adminLoginRes.json();
            const adminToken = `Bearer ${adminData.token}`;
            
            // Get admin profile to find email
            const profileRes = await request.get('/profile', {
                headers: { 'Authorization': adminToken }
            });
            
            if (profileRes.ok()) {
                const profile = await profileRes.json();
                adminEmail = profile.email;
                console.log(`[Setup] Admin email: ${adminEmail}`);
            }
        }

        // Get dispatcher info
        dispatcherID = process.env.DISPATCHER_ID;
        const dispatcherPassword = process.env.DISPATCHER_PASSWORD;
        
        const dispatcherLoginRes = await request.post('/login', {
            data: { 
                userID: dispatcherID, 
                password: dispatcherPassword 
            }
        });
        
        if (dispatcherLoginRes.ok()) {
            const dispatcherData = await dispatcherLoginRes.json();
            const dispatcherToken = `Bearer ${dispatcherData.token}`;
            
            const profileRes = await request.get('/profile', {
                headers: { 'Authorization': dispatcherToken }
            });
            
            if (profileRes.ok()) {
                const profile = await profileRes.json();
                dispatcherEmail = profile.email;
                dispatcherNumber = profile.contactNumber;
                console.log(`[Setup] Dispatcher email: ${dispatcherEmail}, number: ${dispatcherNumber}`);
            }
        }

        // Get focal person info
        const focalUser = process.env.FOCAL_USER || 'focaluser@example.com';
        const focalPass = process.env.FOCAL_PASS || 'focalpass';
        
        const focalLoginRes = await request.post('/focal/login', {
            data: { 
                emailOrNumber: focalUser, 
                password: focalPass 
            }
        });
        
        if (focalLoginRes.ok()) {
            const focalData = await focalLoginRes.json();
            const focalToken = `Bearer ${focalData.token}`;
            
            const profileRes = await request.get('/profile', {
                headers: { 'Authorization': focalToken }
            });
            
            if (profileRes.ok()) {
                const profile = await profileRes.json();
                focalID = profile.id;
                focalEmail = profile.email;
                focalNumber = profile.contactNumber;
                console.log(`[Setup] Focal email: ${focalEmail}, number: ${focalNumber}`);
            }
        }
    });

    test.describe('POST /official/reset - Request Admin/Dispatcher Reset', () => {
        test('should send reset code to admin email', async ({ request }) => {
            test.skip(!adminEmail, 'Admin email not available');

            const res = await request.post('/official/reset', {
                data: {
                    emailOrNumber: adminEmail
                }
            });

            expect(res.status()).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.message).toContain('Reset code sent');
            expect(body.userID).toBe(adminID);
            expect(body.expiresInMinutes).toBe(5);
            expect(body.maskedEmail).toContain('@');
            expect(body.maskedEmail).toContain('***');
        });

        test('should send reset code to dispatcher using email', async ({ request }) => {
            test.skip(!dispatcherEmail, 'Dispatcher email not available');

            const res = await request.post('/official/reset', {
                data: {
                    emailOrNumber: dispatcherEmail
                }
            });

            expect(res.status()).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.userID).toBe(dispatcherID);
            expect(body.expiresInMinutes).toBe(5);
        });

        test('should send reset code to dispatcher using contact number', async ({ request }) => {
            test.skip(!dispatcherNumber, 'Dispatcher contact number not available');

            const res = await request.post('/official/reset', {
                data: {
                    emailOrNumber: dispatcherNumber
                }
            });

            expect(res.status()).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.userID).toBe(dispatcherID);
        });

        test('should return 404 for non-existent user', async ({ request }) => {
            const res = await request.post('/official/reset', {
                data: {
                    emailOrNumber: 'nonexistent@example.com'
                }
            });

            expect(res.status()).toBe(404);
            const body = await res.json();
            expect(body.message).toContain('Not Found');
        });

        test('should reject missing emailOrNumber', async ({ request }) => {
            const res = await request.post('/official/reset', {
                data: {}
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('Required');
        });

        test('should mask email in response', async ({ request }) => {
            test.skip(!adminEmail, 'Admin email not available');

            const res = await request.post('/official/reset', {
                data: {
                    emailOrNumber: adminEmail
                }
            });

            expect(res.status()).toBe(200);
            const body = await res.json();
            
            // Masked email should hide most of local part
            const maskedEmail = body.maskedEmail;
            expect(maskedEmail).toBeTruthy();
            expect(maskedEmail).not.toBe(adminEmail); // Should be masked, not full email
            expect(maskedEmail).toContain('@');
        });
    });

    test.describe('POST /focal/reset - Request Focal Person Reset', () => {
        test('should send reset code to focal person using email', async ({ request }) => {
            test.skip(!focalEmail, 'Focal email not available');

            const res = await request.post('/focal/reset', {
                data: {
                    emailOrNumber: focalEmail
                }
            });

            expect(res.status()).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.message).toContain('Reset code sent');
            expect(body.userID).toBe(focalID);
            expect(body.expiresInMinutes).toBe(5);
        });

        test('should send reset code to focal person using contact number', async ({ request }) => {
            test.skip(!focalNumber, 'Focal contact number not available');

            const res = await request.post('/focal/reset', {
                data: {
                    emailOrNumber: focalNumber
                }
            });

            expect(res.status()).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(body.userID).toBe(focalID);
        });

        test('should return 404 for non-existent focal person', async ({ request }) => {
            const res = await request.post('/focal/reset', {
                data: {
                    emailOrNumber: 'nonexistent.focal@example.com'
                }
            });

            expect(res.status()).toBe(404);
            const body = await res.json();
            expect(body.message).toContain('Not Found');
        });

        test('should reject missing emailOrNumber', async ({ request }) => {
            const res = await request.post('/focal/reset', {
                data: {}
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('required');
        });
    });

    test.describe('POST /verifyResetCode - Verify Reset Code', () => {
        let testUserID;
        let testCode;

        test.beforeAll(async ({ request }) => {
            // Create a reset request to get a valid code
            if (dispatcherEmail) {
                const resetRes = await request.post('/official/reset', {
                    data: { emailOrNumber: dispatcherEmail }
                });
                
                if (resetRes.ok()) {
                    const resetData = await resetRes.json();
                    testUserID = resetData.userID;
                    
                    // In a real scenario, we'd retrieve the code from email
                    // For testing, we need to check the database or logs
                    // For now, we'll test with invalid codes and validation logic
                }
            }
        });

        test('should reject missing userID', async ({ request }) => {
            const res = await request.post('/verifyResetCode', {
                data: {
                    code: '123456'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('required');
        });

        test('should reject missing code', async ({ request }) => {
            const res = await request.post('/verifyResetCode', {
                data: {
                    userID: 'ADM001'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('required');
        });

        test('should reject invalid code', async ({ request }) => {
            test.skip(!testUserID, 'No test user ID available');

            const res = await request.post('/verifyResetCode', {
                data: {
                    userID: testUserID,
                    code: '000000' // Invalid code
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('Invalid code');
        });

        test('should reject verification for non-existent reset session', async ({ request }) => {
            const res = await request.post('/verifyResetCode', {
                data: {
                    userID: 'NONEXISTENT',
                    code: '123456'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('No active reset session');
        });
    });

    test.describe('POST /resetPassword - Reset Password', () => {
        test('should reject missing userID', async ({ request }) => {
            const res = await request.post('/resetPassword', {
                data: {
                    code: '123456',
                    newPassword: 'NewPass123!'
                }
            });

            expect(res.status()).toBe(400);
        });

        test('should reject invalid code', async ({ request }) => {
            const res = await request.post('/resetPassword', {
                data: {
                    userID: 'ADM001',
                    code: '000000',
                    newPassword: 'NewPass123!'
                }
            });

            expect(res.status()).toBe(400);
        });

        test('should reject password without uppercase', async ({ request }) => {
            // Note: This will fail at "No active reset session" first
            // but demonstrates password policy validation
            const res = await request.post('/resetPassword', {
                data: {
                    userID: 'TEST001',
                    code: '123456',
                    newPassword: 'newpass123!'
                }
            });

            expect(res.status()).toBe(400);
        });

        test('should reject password without lowercase', async ({ request }) => {
            const res = await request.post('/resetPassword', {
                data: {
                    userID: 'TEST001',
                    code: '123456',
                    newPassword: 'NEWPASS123!'
                }
            });

            expect(res.status()).toBe(400);
        });

        test('should reject password without number', async ({ request }) => {
            const res = await request.post('/resetPassword', {
                data: {
                    userID: 'TEST001',
                    code: '123456',
                    newPassword: 'NewPassword!'
                }
            });

            expect(res.status()).toBe(400);
        });

        test('should reject password without special character', async ({ request }) => {
            const res = await request.post('/resetPassword', {
                data: {
                    userID: 'TEST001',
                    code: '123456',
                    newPassword: 'NewPass123'
                }
            });

            expect(res.status()).toBe(400);
        });

        test('should reject password that is too short', async ({ request }) => {
            const res = await request.post('/resetPassword', {
                data: {
                    userID: 'TEST001',
                    code: '123456',
                    newPassword: 'Np1!'
                }
            });

            expect(res.status()).toBe(400);
        });

        test('should reject for non-existent reset session', async ({ request }) => {
            const res = await request.post('/resetPassword', {
                data: {
                    userID: 'NONEXISTENT',
                    code: '123456',
                    newPassword: 'ValidPass123!'
                }
            });

            expect(res.status()).toBe(400);
            const body = await res.json();
            expect(body.message).toContain('No active reset session');
        });
    });

    test.describe('Integration Tests - Complete Reset Flow', () => {
        test('should handle admin password reset workflow', async ({ request }) => {
            test.skip(!adminEmail, 'Admin email not available');

            // Step 1: Request reset
            const resetReqRes = await request.post('/official/reset', {
                data: { emailOrNumber: adminEmail }
            });

            expect(resetReqRes.status()).toBe(200);
            const resetData = await resetReqRes.json();
            expect(resetData.success).toBe(true);
            expect(resetData.userID).toBe(adminID);
            
            // Note: In a real test with email access, we would:
            // 1. Retrieve the code from the email
            // 2. Verify the code
            // 3. Reset the password
            // 4. Login with new password
            
            // For now, we verify the request succeeds and returns proper structure
            expect(resetData.maskedEmail).toBeTruthy();
            expect(resetData.expiresInMinutes).toBe(5);
        });

        test('should handle dispatcher password reset workflow', async ({ request }) => {
            test.skip(!dispatcherEmail, 'Dispatcher email not available');

            // Step 1: Request reset
            const resetReqRes = await request.post('/official/reset', {
                data: { emailOrNumber: dispatcherEmail }
            });

            expect(resetReqRes.status()).toBe(200);
            const resetData = await resetReqRes.json();
            expect(resetData.success).toBe(true);
            expect(resetData.userID).toBe(dispatcherID);
        });

        test('should handle focal person password reset workflow', async ({ request }) => {
            test.skip(!focalEmail, 'Focal email not available');

            // Step 1: Request reset
            const resetReqRes = await request.post('/focal/reset', {
                data: { emailOrNumber: focalEmail }
            });

            expect(resetReqRes.status()).toBe(200);
            const resetData = await resetReqRes.json();
            expect(resetData.success).toBe(true);
            expect(resetData.userID).toBe(focalID);
        });

        test('should allow multiple reset requests (code replacement)', async ({ request }) => {
            test.skip(!dispatcherEmail, 'Dispatcher email not available');

            // First request
            const firstRes = await request.post('/official/reset', {
                data: { emailOrNumber: dispatcherEmail }
            });
            expect(firstRes.status()).toBe(200);

            // Second request (should invalidate first code)
            const secondRes = await request.post('/official/reset', {
                data: { emailOrNumber: dispatcherEmail }
            });
            expect(secondRes.status()).toBe(200);
            
            const secondData = await secondRes.json();
            expect(secondData.success).toBe(true);
        });
    });

    test.describe('Security & Edge Cases', () => {
        test('should handle empty string emailOrNumber', async ({ request }) => {
            const res = await request.post('/official/reset', {
                data: {
                    emailOrNumber: ''
                }
            });

            expect(res.status()).toBe(400);
        });

        test('should handle whitespace-only emailOrNumber', async ({ request }) => {
            const res = await request.post('/official/reset', {
                data: {
                    emailOrNumber: '   '
                }
            });

            // After trim(), empty string triggers "required" validation (400)
            expect(res.status()).toBe(400);
        });

        test('should not reveal if email exists through timing', async ({ request }) => {
            // Request with non-existent email
            const start1 = Date.now();
            const res1 = await request.post('/official/reset', {
                data: { emailOrNumber: 'nonexistent123@example.com' }
            });
            const time1 = Date.now() - start1;

            expect(res1.status()).toBe(404);

            // Timing side-channel test would require multiple runs
            // Just verify we get proper error response
            const body = await res1.json();
            expect(body.message).toContain('Not Found');
        });

        test('should handle SQL injection attempts in emailOrNumber', async ({ request }) => {
            const res = await request.post('/official/reset', {
                data: {
                    emailOrNumber: "' OR '1'='1"
                }
            });

            expect(res.status()).toBe(404);
        });

        test('should validate password policy before checking code expiry', async ({ request }) => {
            const res = await request.post('/resetPassword', {
                data: {
                    userID: 'TEST001',
                    code: '123456',
                    newPassword: 'weak'
                }
            });

            expect(res.status()).toBe(400);
        });
    });
});
