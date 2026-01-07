const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { AppDataSource } = require("../config/dataSource");
const alertRepo = AppDataSource.getRepository("Alert");
const terminalRepo = AppDataSource.getRepository("Terminal");
const neighborhoodRepo = AppDataSource.getRepository("Neighborhood");
const focalPersonRepo = AppDataSource.getRepository("FocalPerson");
const { deleteCache } = require("../config/cache");

let io;

function setupSocket(server, options = {}) {
  io = new Server(server, {
    cors: { origin: options.origin || "http://localhost:5173", credentials: true },
  });

  // JWT auth for sockets
  io.use((socket, next) => {
    try {
      const header = socket.handshake.headers?.authorization || "";
      const raw = socket.handshake.auth?.token || header;
      const token = raw?.startsWith("Bearer ") ? raw.slice(7) : raw;
      if (!token) return next(new Error("UNAUTHORIZED"));
      socket.data.user = jwt.verify(token, process.env.JWT_SECRET || "ResQWave-SecretKey");
      return next();
    } catch (e) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Socket auth failed:", e.message);
      }
      return next(new Error("FORBIDDEN"));
    }
  });

  // Helper: ALRT001-style IDs
  const generateAlertId = async () => {
    const latest = await alertRepo
      .createQueryBuilder("a")
      .orderBy("a.id", "DESC")
      .limit(1)
      .getOne();
    const n = parseInt((latest?.id || "ALRT000").replace("ALRT", ""), 10) + 1;
    return `ALRT${String(n).padStart(3, "0")}`;
  };

  io.on("connection", (socket) => {
    const user = socket.data.user;
    console.log("[socket] connected", socket.id, { role: user?.role, id: user?.id });

    // ✅ Every admin/dispatcher joins the alerts room
    if (user?.role === "admin" || user?.role === "dispatcher") {
      socket.join("alerts:all");
      console.log("[socket] joined room alerts:all");
    }

    socket.on("terminal:join", ({ terminalId }) => {
      if (terminalId) {
        socket.join(`terminal:${terminalId}`);
        console.log("[socket] joined room", `terminal:${terminalId}`);
      }
    });

    const handleTrigger = async (payload, ack) => {
      try {
        console.log("[socket] alert trigger payload:", payload);
        const { terminalId, alertType, status = alertType, terminalStatus } = payload || {};
        if (!terminalId || !alertType) throw new Error("terminalId and alertType are required");

        const terminal = await terminalRepo.findOne({ where: { id: terminalId } });
        if (!terminal) throw new Error(`Terminal ${terminalId} not found`);
        
        // ✅ Update terminal status in database if provided
        if (terminalStatus && (terminalStatus === 'Online' || terminalStatus === 'Offline')) {
          terminal.status = terminalStatus;
          await terminalRepo.save(terminal);
          console.log(`[socket] Updated terminal ${terminalId} status to ${terminalStatus} in database`);
        }

        const id = await generateAlertId();
        const entity = alertRepo.create({
          id,
          terminalID: terminalId,
          alertType,
          status, // "Critical" | "User-Initiated"
        });
        const saved = await alertRepo.save(entity);
        await deleteCache("adminDashboardStats");
        await deleteCache("adminDashboard:aggregatedMap");

        // Get neighborhood and focal person separately (no relation defined in model)
        const neighborhood = await neighborhoodRepo.findOne({ 
          where: { terminalID: terminalId } 
        });

        let focalPerson = null;
        if (neighborhood?.focalPersonID) {
          focalPerson = await focalPersonRepo.findOne({
            where: { id: neighborhood.focalPersonID }
          });
        }

        const livePayload = {
          alertId: saved.id,
          terminalId,
          communityGroupName: null, // Neighborhood doesn't have a name field
          alertType,
          status,
          lastSignalTime: saved.dateTimeSent || saved.createdAt || new Date(),
          address: focalPerson?.address || null,
        };

        // Map payload matching frontend MapAlertResponse structure
        const mapPayload = {
          alertId: saved.id,
          alertType,
          timeSent: saved.dateTimeSent || saved.createdAt || new Date(),
          alertStatus: status,
          terminalId: terminal.id,
          terminalName: terminal.name || `Terminal ${terminalId}`,
          terminalStatus: terminal.status || 'Offline', // ✅ Now reflects the updated database value
          focalPersonId: focalPerson?.id || null,
          focalFirstName: focalPerson?.firstName || 'N/A',
          focalLastName: focalPerson?.lastName || '',
          focalAddress: focalPerson?.address || null,
          focalContactNumber: focalPerson?.contactNumber || 'N/A',
        };

        console.log("[socket] mapPayload being sent:", JSON.stringify(mapPayload, null, 2));

        console.log("[socket] broadcasting alerts", { livePayload, mapPayload });

        // Emit to dashboards
        io.to("alerts:all").emit("liveReport:new", livePayload);
        io.to("alerts:all").emit("mapReport:new", mapPayload);

        // Emit to terminal-specific room
        io.to(`terminal:${terminalId}`).emit("liveReport:new", livePayload);
        io.to(`terminal:${terminalId}`).emit("mapReport:new", mapPayload);

        ack?.({ ok: true, alertId: saved.id });
      } catch (err) {
        console.error("[socket] alert error:", err.message);
        ack?.({ ok: false, error: err.message });
      }
    };

    socket.on("alert:trigger", handleTrigger);
    socket.on("alert:simulate", handleTrigger); // alias for testing
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io not initialized. Call setupSocket(server) first.");
  }
  return io;
}

module.exports = { setupSocket, getIO };
