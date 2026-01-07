const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { AppDataSource } = require("./config/dataSource");
const http = require("http");
const { setupSocket } = require("./realtime/socket");
const authRoutes = require("./routes/authRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const resetPasswordRoutes = require("./routes/resetPasswordRoutes");
const dispatcherRoutes = require("./routes/dispatcherRoutes");
const terminalRoutes = require("./routes/terminalRoutes");
const focalPersonRoutes = require("./routes/focalPersonRoutes");
const neighborhoodRoutes = require("./routes/neighborhoodRoutes");
const alertRoutes = require("./routes/alertRoutes");
const alarmRoutes = require("./routes/alarmRoutes");
const profileRoutes = require("./routes/profileRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const rescueFormRoutes = require("./routes/rescueFormRoutes");
const postRescueRoutes = require("./routes/postRescueRoutes");
const graphRoutes = require("./routes/graphRoutes");
const documentRoutes = require("./routes/documentRoutes");
const focalRegistrationRoutes = require("./routes/focalRegistrationRoutes");
const logsRoute = require("./routes/logRoutes");
const adminLogRoutes = require("./routes/adminLogRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const sensorDataRoutes = require("./routes/sensorDataRoutes");
const lmsRoutes = require("./routes/lmsRoutes");
const { authMiddleware, requireRole } = require("./middleware/authMiddleware");
const { getTerminalsForMap } = require("./controllers/terminalController");
const { createCriticalAlert, createUserInitiatedAlert } = require("./controllers/alertController");

// Test For Realtime
// Remove the comment to test again
const path = require("path");

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://resqwave.vercel.app",
      "https://resqwave-production.up.railway.app",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"],
  })
);
app.use(express.json());

//Connect DB
AppDataSource.initialize()
  .then(() => {
    console.log("Database Connected and Synced!");

    // test route
    app.get("/", (req, res) => {
      res.send("ResQWave Backend Running");
    });

    // Serve static files (for test page)
    // Add comment to test the realtime page again
    app.use(express.static(path.join(__dirname, "public")));

    // Public Routes
    app.use("/", authRoutes);
    app.use("/", resetPasswordRoutes);
    app.use("/", verificationRoutes);
    app.use("/", focalRegistrationRoutes);
    app.use("/", sensorDataRoutes); // public route for sensor data
    app.use("/lms", lmsRoutes); // public routes for the data

    // Chatbot (public) routes
    app.use("/chatbot", chatbotRoutes);

    // Public endpoint for map data (landing page)
    app.get("/terminals/map", getTerminalsForMap);

    // Public alert creation endpoints
    app.post("/alerts/critical", createCriticalAlert);
    app.post("/alerts/user", createUserInitiatedAlert);

    // Protect Everything After This
    app.use(authMiddleware);

    // Protected Routes
    // Only Admin can access Dispatcher Management
    // Only Admin can access Admin Logs
    app.use("/dispatcher", requireRole("admin"), dispatcherRoutes);
    app.use("/terminal", requireRole(["admin", "dispatcher"]), terminalRoutes);
    app.use("/focalperson", focalPersonRoutes);
    app.use("/neighborhood", neighborhoodRoutes);
    app.use("/logs", logsRoute);
    app.use("/admin-logs", requireRole("admin"), adminLogRoutes);
    app.use("/admin-dashboard", requireRole("admin"), adminDashboardRoutes);
    app.use("/alerts", alertRoutes);
    app.use("/alarms", alarmRoutes);
    app.use("/profile", profileRoutes);
    app.use("/forms", rescueFormRoutes);
    app.use("/post", postRescueRoutes);
    app.use("/", graphRoutes);
    app.use("/", documentRoutes);

    const server = http.createServer(app);
    setupSocket(server, {
      origin: [
        "http://localhost:5173",
        "https://resqwave.vercel.app", // Add this
      ],
      credentials: true,
    });
    server.listen(5000, () =>
      console.log("Server + SocketIO at http://localhost:5000")
    );
  })
  .catch((err) => console.error("DB Error", err));
