// Test script to verify date formatting
// This can be removed later - just for testing

import { transformTerminalResponse } from "../api/terminalApi";

// Test data mimicking backend response
const testTerminalData = {
  id: "RESQWAVE001",
  name: "Test Terminal",
  status: "Online" as const,
  availability: "Available" as const,
  dateCreated: "2024-01-15T10:30:00.000Z",
  dateUpdated: "2024-01-20T14:45:00.000Z",
};

// Test with invalid date
const testInvalidDate = {
  id: "RESQWAVE002",
  name: "Test Terminal 2",
  status: "Offline" as const,
  availability: "Occupied" as const,
  dateCreated: "invalid-date",
  dateUpdated: undefined,
};

console.log("Testing valid date transformation:");
console.log(transformTerminalResponse(testTerminalData));

console.log("\nTesting invalid date transformation:");
console.log(transformTerminalResponse(testInvalidDate));
