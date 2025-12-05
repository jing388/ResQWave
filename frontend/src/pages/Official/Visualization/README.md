🗺️ Visualization Map - Documentation
🚀 Overview

The Visualization Map in ResQWave displays all occupied terminals in real time. Each terminal is represented by a colored pin based on its current status or alert type.

🎨 Pin Colors
Color Hex Meaning
🔴 Red #ef4444 Critical – Triggered by sensors
🟡 Yellow #eab308 User-Initiated Alert
🟢 Green #22c55e Online – No alert
⚪ Gray #6b7280 Offline – No alert

⚠️ Note: Alert type overrides terminal status.
If alertType is NULL, the system displays the Online/Offline state.

🔁 Data Flow
Database → API (10s cache) → mapAlerts.ts → useMapAlerts (30s poll)
→ useSignals → index.tsx → SignalPopover

🧩 Backend Integration
📡 API Endpoints
Endpoint Description
GET /api/alerts/map/unassigned Fetches all unassigned alerts
GET /api/alerts/map/waitlisted Fetches all waitlisted alerts

⏱️ Caching:

Backend: 10 seconds
Frontend Polling: Every 30 seconds

🧾 Response Example
{
"alertId": "uuid",
"alertType": "Critical" | "User-Initiated" | null,
"terminalId": "RSQW-001",
"terminalStatus": "Online" | "Offline",
"focalFirstName": "John",
"focalLastName": "Doe",
"focalAddress": "{\"address\":\"Street, City\",\"coordinates\":\"121.03,14.75\"}",
"focalContactNumber": "+63 912 345 6789"
}

🗃️ Database Schema
terminals (
id,
name,
status
)

alerts (
terminalID,
alertType,
dateTimeSent
)

neighborhood (
terminalID,
focalPersonID
)

focalpersons (
id,
firstName,
lastName,
address,
contactNumber
)

🧱 Frontend Structure
Visualization/
├── api/
│ └── mapAlerts.ts # API calls & data parsing
├── hooks/
│ ├── useMapAlerts.ts # Polling every 30s
│ └── useSignals.ts # Signal state management
├── components/
│ ├── SignalPopover.tsx # Alert popup display
│ ├── LiveReportSidebar.tsx # Live alert list sidebar
│ └── MapControls.tsx # Map zoom/layer controls
└── index.tsx # Main visualization map

🗺️ ResQWave Visualization Map - User Story
Overview
The Visualization Map provides real-time emergency monitoring and rescue dispatch management for dispatchers and administrators.

📍 User Story Flow

1. Real-Time Map Visualization
   As a dispatcher, I want to see live emergency alerts on a map so I can monitor all terminals in real-time.

🟢 Green pins = Terminals online, no alerts
⚪ Gray pins = Terminals offline, no alerts
🟡 Yellow pins = User-Initiated alerts (manual trigger)
🔴 Red pins = Critical alerts (sensor-triggered emergencies)
How it works:

Pins update instantly via WebSocket when alerts are triggered
No need to refresh - changes appear in real-time
Each pin represents a terminal location with focal person details 2. Live Report Sidebar - Unassigned Tab
As a dispatcher, I want to see all unassigned alerts so I can prioritize rescue operations.

Location: Right sidebar → "Unassigned" tab

Displays:

All Critical and User-Initiated alerts
Alerts with status = "ONLINE" (active, not yet assigned)
Shows: Terminal name, alert type, focal person, address, contact number
Action: Click on any alert card to view details

3. Signal Popover - View Alert Details
   As a dispatcher, I want to click on an alert to see full details and take action.

What appears:

Terminal ID & Name
Alert Type (Critical/User-Initiated)
Terminal Status (Online/Offline)
Focal Person name
Address with coordinates
Contact Number
Time & Date
Actions available:

📋 "Rescue Form" button → Opens rescue dispatch form
🏘️ "Community Info" button → View community details
❌ Close popover 4. Rescue Form - Dispatch Decision
As a dispatcher, I want to fill out rescue details and decide whether to dispatch immediately or add to waitlist.

Form fields include:

Rescue team assignment
Equipment needed
Severity assessment
Special instructions
Estimated time of arrival
Two action buttons:

Option A: 🟡 Waitlist
Saves form data
Moves alert to "Waitlisted" tab in Live Report Sidebar
Alert remains visible but marked as "waiting for resources"
Can be dispatched later
Option B: 🚨 Dispatch Rescue
Saves form data
Removes alert from Live Report Sidebar
Creates a new entry in Reports → Pending Tab
Rescue operation is now active 5. Waitlisted Tab - Pending Resources
As a dispatcher, I want to manage alerts that are waiting for available rescue teams.

Location: Right sidebar → "Waitlisted" tab

Displays:

Alerts marked as "Waitlisted" from the rescue form
Shows same details as unassigned tab
Allows dispatcher to review and dispatch when resources are available
Action: Click to re-open rescue form and dispatch

6. Reports - Pending Tab
   As a dispatcher, I want to track all active rescue operations.

Location: Navigate to Reports page → Pending tab

Displays table with columns:

Alert ID
Terminal Name
Alert Type
Focal Person
Address
Time Dispatched
Action: "Create Report" button
What this means:

Rescue team is currently en route or on-site
Operation is in progress
Report needs to be finalized when complete 7. Create Report - Document Rescue Operation
As a dispatcher, I want to create a detailed post-rescue report.

Triggered by: Clicking "Create Report" button in Pending tab

Report form includes:

Rescue outcome (Successful/Partial/Failed)
People rescued
Casualties (if any)
Resources used
Obstacles encountered
Photos/documentation
Timestamp of completion
Officer/team signatures
Action: Submit report

8. Reports - Completed Tab
   As a dispatcher, I want to review all completed rescue operations.

Location: Navigate to Reports page → Completed tab

Displays table with:

All finalized rescue reports
Outcome status
Summary details
Action: "Export to PDF" button 9. Export to PDF - Generate Documentation
As a dispatcher, I want to export completed reports for archiving and official records.

Triggered by: Clicking "Export to PDF" in Completed tab

What happens:

Generates a formatted PDF document
Includes all rescue details, outcomes, and signatures
PDF appears in "Recently Completed Reports" cards section
Can be downloaded, printed, or shared with authorities
🔄 Complete Workflow Diagram

🗺️ Visualization Map (Real-time pins)
↓ (Click pin or sidebar alert)

📋 Signal Popover (Alert details)
↓ (Click "Rescue Form")

📝 Rescue Form (Fill details)
↓
┌────────┴────────┐
↓ ↓
🟡 Waitlist 🚨 Dispatch
↓ ↓
Waitlist Tab 📊 Pending Tab (Reports page)
↓ ↓
(Can dispatch) "Create Report" button
↓
📄 Post-Rescue Form
↓
✅ Completed Tab
↓
📥 Export to PDF
↓
🗂️ Recently Completed Reports Cards

Key Features
✅ Real-time updates via WebSocket - no page refresh needed
✅ Color-coded pins for instant alert severity recognition
✅ Dual-tab sidebar separating unassigned vs waitlisted alerts
✅ Flexible dispatch flow - immediate dispatch or waitlist
✅ Complete audit trail from alert → dispatch → completion → PDF
✅ Recently Completed Reports for quick access to recent operations

👥 User Roles
Dispatcher: Full access to all features above
Admin: Can view all reports and export PDFs
Focal Person: Can trigger User-Initiated alerts from their dashboard
