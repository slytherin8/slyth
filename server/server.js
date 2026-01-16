const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors"); // ✅ CORS
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");

const app = express();

/* ✅ ENABLE CORS (VERY IMPORTANT) */
app.use(cors());

/* ✅ PARSE JSON */
app.use(express.json());

/* ✅ CONNECT MONGODB */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB error:", err));

/* ✅ ROUTES */
app.use("/api/auth", authRoutes);

/* ✅ TEST ROUTE (OPTIONAL – TO CHECK SERVER) */
app.get("/", (req, res) => {
  res.send("Backend running successfully 🚀");
});

/* ✅ START SERVER */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
