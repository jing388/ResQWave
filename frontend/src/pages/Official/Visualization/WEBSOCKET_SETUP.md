# 🔌 WebSocket Integration Guide

## Overview

ResQWave now has **real-time WebSocket communication** between the backend and frontend for instant alert notifications on the map visualization.

---

## 🏗️ Architecture

```
Terminal Device (Sensor)
        ↓
    Backend API
        ↓
  Socket.IO Server ← JWT Auth
        ↓
   Emit Events:
   - liveReport:new
   - mapReport:new
        ↓
  Frontend Clients
   (Admins/Dispatchers)
        ↓
  Mapbox Visualization
  (Real-time pins update)
```

---

## 📦 Backend Changes

### 1. **socket.js** - Enhanced Payload

The `mapReport:new` event now sends complete data matching the REST API structure:

```javascript
{
  alertId: "ALRT001",
  alertType: "Critical" | "User-Initiated",
  timeSent: "2025-10-28T10:30:00Z",
  alertStatus: "Critical",
  terminalId: "RSQW-001",
  terminalName: "Terminal 1",
  terminalStatus: "Online" | "Offline",
  focalPersonId: "uuid",
  focalFirstName: "John",
  focalLastName: "Doe",
  focalAddress: '{"address":"123 Main St","coordinates":"121.04, 14.77"}',
  focalContactNumber: "+63 912 345 6789"
}
```

### 2. **Database Query** - Includes Focal Person

Now fetches focal person details with the community group:

```javascript
const group = await communityGroupRepo
  .createQueryBuilder("cg")
  .leftJoinAndSelect("cg.focalPerson", "focal")
  .select([...])
  .where("cg.terminalID = :terminalId", { terminalId })
  .getOne();
```

---

## 🎨 Frontend Changes

### 1. **New Files Created**

```
frontend/src/
├── services/
│   └── socketService.ts          # Socket.IO client initialization
├── contexts/
│   └── SocketContext.tsx         # React context for socket
└── pages/Official/Visualization/
    └── hooks/
        └── useMapWebSocket.ts    # Hook for map alerts
```

### 2. **Modified Files**

- `App.tsx` - Wrapped with `SocketProvider`
- `useSignals.ts` - Integrated WebSocket listener
- `useMapAlerts.ts` - Added `addSignal` & `updateSignal` methods
- `mapAlerts.ts` - Exported utility functions

### 3. **How It Works**

```typescript
// 1. App.tsx wraps everything with SocketProvider
<SocketProvider>
  <RouterProvider router={router} />
</SocketProvider>

// 2. SocketContext initializes connection on mount
const token = localStorage.getItem('token');
const socket = initializeSocket(token);

// 3. useMapWebSocket listens for events
socket.on('mapReport:new', (data) => {
  const signal = transformToMapSignal(data);
  onNewAlert(signal);
});

// 4. useSignals handles the new alert
const handleNewAlert = (newSignal) => {
  // Check if exists → update, else add
  exists ? updateSignal(newSignal) : addSignal(newSignal);
};

// 5. Map visualization auto-updates with new pins! 🎯
```

---

## 🚀 Testing

### Option 1: Backend Test Page

1. Start backend: `npm run dev` (in `backend/`)
2. Visit: http://localhost:5000/live.html
3. Paste JWT token (from login)
4. Click "Connect"
5. Open another tab and trigger an alert

### Option 2: Simulate Alert via Script

```bash
cd backend
node scripts/simulateAlert.js
```

### Option 3: Test from Frontend

1. Start frontend: `npm run dev` (in `frontend/`)
2. Login as admin/dispatcher
3. Go to Visualization page
4. Open browser console (F12)
5. Look for:
   ```
   [Socket] Connected: <socket-id>
   [WebSocket] Setting up mapReport:new listener
   ```
6. Trigger alert from another source
7. Watch pin appear instantly! 🔴

---

## 🎨 Pin Colors (Reminder)

| Alert Type         | Color     | Hex     |
| ------------------ | --------- | ------- |
| Critical           | 🔴 Red    | #ef4444 |
| User-Initiated     | 🟡 Yellow | #eab308 |
| Online (no alert)  | 🟢 Green  | #22c55e |
| Offline (no alert) | ⚪ Gray   | #6b7280 |

**Logic**: `alertType` overrides `terminalStatus`

---

## 📊 Data Flow Comparison

### Before (REST Only)

```
Database → API (10s cache) → Poll every 30s → Update map
⏱️ Up to 30 second delay
```

### After (REST + WebSocket)

```
Database → Socket.IO → Instant push → Update map
⚡ ~100ms latency
```

**REST API still used for**:

- Initial page load
- Fallback if WebSocket disconnects
- 30-second polling as backup

---

## 🔐 Authentication

WebSocket requires JWT token:

```typescript
// Automatically reads from localStorage
const token = localStorage.getItem("token");

// Sent in auth handshake
socket = io("http://localhost:5000", {
  auth: { token },
});
```

Backend validates token in middleware:

```javascript
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  socket.data.user = jwt.verify(token, SECRET);
  // Auto-join admins/dispatchers to "alerts:all" room
});
```

---

## 🐛 Troubleshooting

### WebSocket not connecting?

Check browser console:

```
[Socket] Connected: abc123  ✅ Good
[Socket] Connection error   ❌ Check token
```

### Not receiving alerts?

1. Verify user role (admin/dispatcher only)
2. Check backend logs: `[socket] broadcasting alerts`
3. Ensure frontend listener is set up: `[WebSocket] Setting up mapReport:new listener`

### Duplicate signals?

The code handles this:

```typescript
const exists = prev.some((s) => s.alertId === newSignal.alertId);
if (exists) return prev; // Skip duplicate
```

---

## 📝 Event Reference

### Backend Emits

| Event            | Room            | Data                | Purpose           |
| ---------------- | --------------- | ------------------- | ----------------- |
| `liveReport:new` | `alerts:all`    | Live report payload | Dashboard sidebar |
| `mapReport:new`  | `alerts:all`    | Map alert payload   | Map visualization |
| `mapReport:new`  | `terminal:{id}` | Map alert payload   | Terminal-specific |

### Frontend Listens

| Event           | Handler            | Action                   |
| --------------- | ------------------ | ------------------------ |
| `connect`       | `handleConnect`    | Set `isConnected: true`  |
| `disconnect`    | `handleDisconnect` | Set `isConnected: false` |
| `mapReport:new` | `handleMapReport`  | Add/update map pin       |

---

## 🔄 Reconnection

Auto-reconnect on disconnect:

```typescript
socket = io("http://localhost:5000", {
  reconnection: true,
  reconnectionDelay: 1000, // 1 second
  reconnectionAttempts: 5, // Try 5 times
});
```

---

## 🎯 Next Steps

- [ ] Add visual indicator for WebSocket connection status
- [ ] Show toast notification when new alert arrives
- [ ] Add sound alert for critical emergencies
- [ ] Implement `alert:resolved` event for clearing pins
- [ ] Add terminal status change events (Online/Offline)

---

## 📚 Resources

- [Socket.IO Docs](https://socket.io/docs/v4/)
- [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/api/)
- [React Context API](https://react.dev/reference/react/useContext)

---

**Status**: ✅ WebSocket integration complete and ready for testing!
