const jwt = require("jsonwebtoken");

/* 🔐 AUTH MIDDLEWARE */
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Auth Middleware - Decoded Payload:", decoded);

    req.user = decoded; // { id, role, companyId }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* 👑 ADMIN ONLY */
const adminOnly = (req, res, next) => {
  const role = (req.user?.role || "").toLowerCase();
  console.log(`[DEBUG] adminOnly middleware triggered for: ${req.method} ${req.originalUrl}`);
  console.log("AdminOnly Middleware - User Role:", role);
  if (role !== "admin") {
    console.warn("403 Forbidden: User is not an admin", {
      url: req.originalUrl,
      user: req.user
    });
    return res.status(403).json({
      message: "Admin access only",
      debug_role: req.user?.role,
      debug_url: req.originalUrl
    });
  }
  next();
};

module.exports = { auth, adminOnly };
