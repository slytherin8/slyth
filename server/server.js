const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const directMessageRoutes = require("./routes/directMessageRoutes");
const vaultRoutes = require("./routes/vaultRoutes");
const workRoutes = require("./routes/workRoutes");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.set("io", io);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Increased limit for development
  message: "Too many requests from this IP, please try again later."
});
app.use(limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased limit for development
  message: "Too many authentication attempts, please try again later."
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/direct-messages", directMessageRoutes);
app.use("/api/vault", vaultRoutes);
app.use("/api/work", workRoutes);

app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

const PORT = process.env.PORT || 3000;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  socket.on("join_room", (userId) => {
    socket.join(userId.toString());
    console.log(`User ${userId} joined room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 30000
    });
    console.log("Connected to MongoDB");

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
}

startServer();
