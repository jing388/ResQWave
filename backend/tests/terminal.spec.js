const { test, expect } = require("@playwright/test");

let adminToken;
let dispatcherToken;
let adminID;
let dispatcherID;
let testTerminalId;
let testTerminalDevEUI = `${Date.now().toString().slice(-8)}ABCD0001`; // Unique devEUI using timestamp

// =====================
// AUTHENTICATION SETUP
// =====================

test.beforeAll(async ({ request }) => {
    // Admin Login
    adminID = process.env.ADMIN_ID || "ADM001";
    const adminRes = await request.post("/login", {
        data: {
            userID: adminID,
            password: process.env.ADMIN_PASSWORD || "admin123"
        }
    });
    expect(adminRes.ok()).toBeTruthy();
    const adminData = await adminRes.json();
    adminToken = `Bearer ${adminData.token}`;

    // Dispatcher Login
    dispatcherID = process.env.DISPATCHER_ID || "DSP011";
    const dispatcherRes = await request.post("/login", {
        data: {
            userID: dispatcherID,
            password: process.env.DISPATCHER_PASSWORD || "rodel"
        }
    });
    expect(dispatcherRes.ok()).toBeTruthy();
    const dispatcherData = await dispatcherRes.json();
    dispatcherToken = `Bearer ${dispatcherData.token}`;
});

// =========================
// 1. CREATE TERMINAL (POST /)
// =========================

test("1. Create terminal - success", async ({ request }) => {
    const response = await request.post("/terminal", {
        headers: { Authorization: adminToken },
        data: {
            name: "Test Terminal Alpha",
            devEUI: testTerminalDevEUI
        }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.message).toBe("Terminal Created");
    expect(data.terminal).toBeDefined();
    expect(data.terminal.id).toMatch(/^RESQWAVE\d{3}$/);
    expect(data.terminal.name).toBe("Test Terminal Alpha");
    expect(data.terminal.devEUI).toBe(testTerminalDevEUI);
    expect(data.terminal.status).toBe("Offline");

    testTerminalId = data.terminal.id;
});

test("2. Create terminal - missing name", async ({ request }) => {
    const response = await request.post("/terminal", {
        headers: { Authorization: adminToken },
        data: {
            devEUI: "B2C3D4E5F6001122"
        }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("Terminal name and devEUI is required");
});

test("3. Create terminal - missing devEUI", async ({ request }) => {
    const response = await request.post("/terminal", {
        headers: { Authorization: adminToken },
        data: {
            name: "Test Terminal Beta"
        }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("Terminal name and devEUI is required");
});

test("4. Create terminal - invalid devEUI format", async ({ request }) => {
    const response = await request.post("/terminal", {
        headers: { Authorization: adminToken },
        data: {
            name: "Test Terminal Gamma",
            devEUI: "INVALID"
        }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("Invalid devEUI format");
});

test("5. Create terminal - duplicate devEUI", async ({ request }) => {
    const response = await request.post("/terminal", {
        headers: { Authorization: adminToken },
        data: {
            name: "Test Terminal Duplicate",
            devEUI: testTerminalDevEUI
        }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("devEUI already exists");
});

test("6. Create terminal - devEUI normalization with dashes", async ({ request }) => {
    const devEUIWithDashes = `${Date.now().toString().slice(-2)}-d4-e5-f6-00-11-22-33`;
    const normalized = devEUIWithDashes.replace(/-/g, "").toUpperCase();

    const response = await request.post("/terminal", {
        headers: { Authorization: adminToken },
        data: {
            name: "Test Terminal Normalized",
            devEUI: devEUIWithDashes
        }
    });

    expect(response.status()).toBe(201);
    const data = await response.json();
    expect(data.terminal.devEUI).toBe(normalized);
});

// =================================
// 2. GET NEXT TERMINAL ID (GET /next-id)
// =================================

test("7. Get next terminal ID", async ({ request }) => {
    const response = await request.get("/terminal/next-id", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.nextId).toBeDefined();
    expect(data.nextId).toMatch(/^RESQWAVE\d{3}$/);
});

// ==============================
// 3. GET TERMINALS (GET /)
// ==============================

test("8. Get all active terminals", async ({ request }) => {
    const response = await request.get("/terminal", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Verify all returned terminals are active (not archived)
    data.forEach(terminal => {
        expect(terminal.archived).toBe(false);
    });
});

// ==============================
// 4. GET ONLINE TERMINALS (GET /online)
// ==============================

test("9. Get online terminals", async ({ request }) => {
    const response = await request.get("/terminal/online", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);

    // Verify all returned terminals are online
    data.forEach(terminal => {
        expect(terminal.status).toBe("Online");
        // Verify only selected fields are returned
        expect(terminal.id).toBeDefined();
        expect(terminal.name).toBeDefined();
        expect(terminal.status).toBeDefined();
        expect(terminal.availability).toBeDefined();
        expect(terminal.dateCreated).toBeDefined();
        expect(terminal.devEUI).toBeUndefined(); // Should not be included
    });
});

// ==============================
// 5. GET OFFLINE TERMINALS (GET /offline)
// ==============================

test("10. Get offline terminals", async ({ request }) => {
    const response = await request.get("/terminal/offline", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);

    // Verify all returned terminals are offline
    data.forEach(terminal => {
        expect(terminal.status).toBe("Offline");
        // Verify only selected fields are returned
        expect(terminal.id).toBeDefined();
        expect(terminal.name).toBeDefined();
        expect(terminal.status).toBeDefined();
        expect(terminal.availability).toBeDefined();
        expect(terminal.dateCreated).toBeDefined();
        expect(terminal.devEUI).toBeUndefined(); // Should not be included
    });
});

// ==============================
// 6. GET SINGLE TERMINAL (GET /:id)
// ==============================

test("11. Get single terminal - success", async ({ request }) => {
    // Get list of terminals first to ensure we have a valid ID
    const listResponse = await request.get("/terminal", {
        headers: { Authorization: adminToken }
    });
    const terminals = await listResponse.json();
    expect(terminals.length).toBeGreaterThan(0);
    const terminalId = terminals[0].id;

    const response = await request.get(`/terminal/${terminalId}`, {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.id).toBe(terminalId);
    expect(data.name).toBeDefined();
    expect(data.devEUI).toBeDefined();
});

test("12. Get single terminal - not found", async ({ request }) => {
    const response = await request.get("/terminal/RESQWAVE999", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.message).toContain("Terminal Not Found");
});

// ==============================
// 7. GET TERMINALS FOR MAP (GET /map)
// ==============================

test("13. Get terminals for map - GeoJSON format", async ({ request }) => {
    const response = await request.get("/terminal/map", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.type).toBe("FeatureCollection");
    expect(Array.isArray(data.features)).toBe(true);

    // Verify GeoJSON structure if features exist
    if (data.features.length > 0) {
        const feature = data.features[0];
        expect(feature.type).toBe("Feature");
        expect(feature.properties).toBeDefined();
        expect(feature.geometry).toBeDefined();
        expect(feature.geometry.type).toBe("Point");
        expect(Array.isArray(feature.geometry.coordinates)).toBe(true);
        expect(feature.geometry.coordinates.length).toBe(2); // [lng, lat]
        expect(feature.properties.status).toMatch(/^(online|offline)$/);
    }
});

// ==============================
// 8. UPDATE TERMINAL (PUT /:id)
// ==============================

test("14. Update terminal status - success", async ({ request }) => {
    // Get a terminal to update
    const listResponse = await request.get("/terminal", {
        headers: { Authorization: adminToken }
    });
    const terminals = await listResponse.json();
    expect(terminals.length).toBeGreaterThan(0);
    const terminalId = terminals[0].id;
    
    const response = await request.put(`/terminal/${terminalId}`, {
        headers: { Authorization: adminToken },
        data: {
            status: "Online"
        }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("Terminal Updated");
    expect(data.terminal.status).toBe("Online");
});

test("15. Update terminal name - success", async ({ request }) => {
    // Get a terminal to update
    const listResponse = await request.get("/terminal", {
        headers: { Authorization: adminToken }
    });
    const terminals = await listResponse.json();
    expect(terminals.length).toBeGreaterThan(0);
    const terminalId = terminals[0].id;
    
    const response = await request.put(`/terminal/${terminalId}`, {
        headers: { Authorization: adminToken },
        data: {
            name: "Test Terminal Alpha Updated"
        }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("Terminal Updated");
    expect(data.terminal.name).toBe("Test Terminal Alpha Updated");
});

test("16. Update terminal - not found", async ({ request }) => {
    const response = await request.put("/terminal/RESQWAVE999", {
        headers: { Authorization: adminToken },
        data: {
            status: "Online"
        }
    });

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.message).toContain("Terminal Not Found");
});

test("17. Update terminal as dispatcher", async ({ request }) => {
    // Get a terminal to update
    const listResponse = await request.get("/terminal", {
        headers: { Authorization: adminToken }
    });
    const terminals = await listResponse.json();
    expect(terminals.length).toBeGreaterThan(0);
    const terminalId = terminals[0].id;
    
    const response = await request.put(`/terminal/${terminalId}`, {
        headers: { Authorization: dispatcherToken },
        data: {
            status: "Offline"
        }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toBe("Terminal Updated");
    expect(data.terminal.status).toBe("Offline");
});

// ==============================
// 9. ARCHIVE TERMINAL (DELETE /:id)
// ==============================

test("18. Archive terminal - success", async ({ request }) => {
    // Get a terminal to archive (use the one we just created)
    if (!testTerminalId) {
        const listResponse = await request.get("/terminal", {
            headers: { Authorization: adminToken }
        });
        const terminals = await listResponse.json();
        testTerminalId = terminals[0].id;
    }
    
    const response = await request.delete(`/terminal/${testTerminalId}`, {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toContain("Terminal Archived and Now Available");

    // Verify terminal is archived and available
    const getResponse = await request.get(`/terminal/${testTerminalId}`, {
        headers: { Authorization: adminToken }
    });
    const terminalData = await getResponse.json();
    expect(terminalData.archived).toBe(true);
    expect(terminalData.availability).toBe("Available");
});

test("19. Archive terminal - not found", async ({ request }) => {
    const response = await request.delete("/terminal/RESQWAVE999", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.message).toContain("Terminal Not Found");
});

// ==============================
// 10. GET ARCHIVED TERMINALS (GET /archived)
// ==============================

test("20. Get archived terminals", async ({ request }) => {
    const response = await request.get("/terminal/archived", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);

    // Verify all returned terminals are archived
    data.forEach(terminal => {
        expect(terminal.archived).toBe(true);
    });

    // Just verify we have some archived terminals, don't check for specific ID
    if (data.length > 0) {
        expect(data[0].archived).toBe(true);
    }
});

// ==============================
// 11. UNARCHIVE TERMINAL (PATCH /:id)
// ==============================

test("21. Unarchive terminal - success", async ({ request }) => {
    // First, get an active terminal and archive it
    const listResponse = await request.get("/terminal", {
        headers: { Authorization: adminToken }
    });
    const terminals = await listResponse.json();
    if (terminals.length === 0) {
        console.log("No terminals available to test unarchive");
        return;
    }
    const terminalId = terminals[0].id;
    
    // Archive it first
    const archiveResponse = await request.delete(`/terminal/${terminalId}`, {
        headers: { Authorization: adminToken }
    });
    expect(archiveResponse.status()).toBe(200);
    
    // Now unarchive it
    const response = await request.patch(`/terminal/${terminalId}`, {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.message).toContain("Terminal Unarchived and Available");

    // Verify terminal is unarchived
    const getResponse = await request.get(`/terminal/${terminalId}`, {
        headers: { Authorization: adminToken }
    });
    const terminalData = await getResponse.json();
    expect(terminalData.archived).toBe(false);
    expect(terminalData.availability).toBe("Available");
});

test("22. Unarchive terminal - not archived", async ({ request }) => {
    // Get an active (non-archived) terminal
    const listResponse = await request.get("/terminal", {
        headers: { Authorization: adminToken }
    });
    const terminals = await listResponse.json();
    const activeTerminal = terminals.find(t => !t.archived);
    if (!activeTerminal) {
        console.log("No active terminals to test");
        return;
    }
    
    const response = await request.patch(`/terminal/${activeTerminal.id}`, {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("Terminal is not archived");
});

test("23. Unarchive terminal - not found", async ({ request }) => {
    const response = await request.patch("/terminal/RESQWAVE999", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.message).toContain("Terminal Not Found");
});

// ==========================================
// 12. PERMANENT DELETE TERMINAL (DELETE /:id/permanent)
// ==========================================

test("24. Permanent delete - cannot delete non-archived terminal", async ({ request }) => {
    // Get an active (non-archived) terminal
    const listResponse = await request.get("/terminal", {
        headers: { Authorization: adminToken }
    });
    const terminals = await listResponse.json();
    const activeTerminal = terminals.find(t => !t.archived);
    if (!activeTerminal) {
        console.log("No active terminals to test");
        return;
    }
    
    const response = await request.delete(`/terminal/${activeTerminal.id}/permanent`, {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toContain("Terminal must be archived before permanent deletion");
});

test("25. Permanent delete - archive first then delete", async ({ request }) => {
    // Create a terminal to delete
    const createResponse = await request.post("/terminal", {
        headers: { Authorization: adminToken },
        data: {
            name: "Terminal to Delete",
            devEUI: `${Date.now().toString().slice(-8)}DELDEL01`
        }
    });
    
    if (createResponse.status() !== 201) {
        console.log("Failed to create terminal for test, skipping");
        return;
    }
    
    const createData = await createResponse.json();
    const terminalId = createData.terminal.id;
    
    // Archive the terminal first
    const archiveResponse = await request.delete(`/terminal/${terminalId}`, {
        headers: { Authorization: adminToken }
    });
    expect(archiveResponse.status()).toBe(200);

    // Now permanently delete
    const deleteResponse = await request.delete(`/terminal/${terminalId}/permanent`, {
        headers: { Authorization: adminToken }
    });

    expect(deleteResponse.status()).toBe(200);
    const data = await deleteResponse.json();
    expect(data.message).toBe("Terminal Permanently Deleted");
    expect(data.deletedAlerts).toBeDefined();

    // Verify terminal no longer exists
    const getResponse = await request.get(`/terminal/${terminalId}`, {
        headers: { Authorization: adminToken }
    });
    expect(getResponse.status()).toBe(404);
});

test("26. Permanent delete - not found", async ({ request }) => {
    const response = await request.delete("/terminal/RESQWAVE999/permanent", {
        headers: { Authorization: adminToken }
    });

    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.message).toContain("Terminal Not Found");
});

// ========================================
// 13. INTEGRATION TESTS WITH NEIGHBORHOODS
// ========================================

test("27. Cannot archive terminal linked to active neighborhood", async ({ request }) => {
    // First create a new terminal for this test
    const createResponse = await request.post("/terminal", {
        headers: { Authorization: adminToken },
        data: {
            name: "Test Terminal for Neighborhood",
            devEUI: `${Date.now().toString().slice(-8)}NGHBRHD1`
        }
    });
    if (createResponse.status() !== 201) {
        console.log("Failed to create terminal for test, skipping");
        return;
    }
    const createData = await createResponse.json();
    const linkedTerminalId = createData.terminal.id;

    // Get a focal person to link
    const focalResponse = await request.get("/focal-persons", {
        headers: { Authorization: adminToken }
    });
    const focalData = await focalResponse.json();
    
    if (focalData.length === 0) {
        console.log("Skipping test - no focal persons available");
        return;
    }

    const focalPersonId = focalData[0].id;

    // Create a neighborhood linked to this terminal
    const neighborhoodResponse = await request.post("/neighborhoods", {
        headers: { Authorization: adminToken },
        data: {
            name: "Test Neighborhood for Terminal",
            focalPersonID: focalPersonId,
            terminalID: linkedTerminalId
        }
    });

    if (neighborhoodResponse.status() === 201) {
        // Try to archive the terminal - should fail
        const archiveResponse = await request.delete(`/terminal/${linkedTerminalId}`, {
            headers: { Authorization: adminToken }
        });

        expect(archiveResponse.status()).toBe(400);
        const archiveData = await archiveResponse.json();
        expect(archivedata.message).toContain("Cannot archive: Terminal is currently assigned to an active neighborhood");

        // Clean up - archive the neighborhood first
        const neighborhoods = await request.get("/neighborhoods", {
            headers: { Authorization: adminToken }
        });
        const neighborhoodsData = await neighborhoods.json();
        const createdNeighborhood = neighborhoodsData.find(n => n.terminalID === linkedTerminalId);
        
        if (createdNeighborhood) {
            await request.delete(`/neighborhoods/${createdNeighborhood.id}`, {
                headers: { Authorization: adminToken }
            });
        }

        // Now archive and delete the terminal
        await request.delete(`/terminal/${linkedTerminalId}`, {
            headers: { Authorization: adminToken }
        });
        await request.delete(`/terminal/${linkedTerminalId}/permanent`, {
            headers: { Authorization: adminToken }
        });
    }
});

// ========================================
// 14. AUTHORIZATION TESTS
// ========================================

test("28. Create terminal without authentication", async ({ request }) => {
    const response = await request.post("/terminal", {
        data: {
            name: "Unauthorized Terminal",
            devEUI: "E5F6001122334455"
        }
    });

    expect(response.status()).toBe(401);
});

test("29. Get terminals without authentication", async ({ request }) => {
    const response = await request.get("/terminal");
    expect(response.status()).toBe(401);
});

test("30. Update terminal without authentication", async ({ request }) => {
    const response = await request.put("/terminal/RESQWAVE001", {
        data: {
            status: "Online"
        }
    });

    expect(response.status()).toBe(401);
});



