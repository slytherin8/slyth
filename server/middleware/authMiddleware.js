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

    req.user = decoded; // { id, role, companyId }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* 👑 ADMIN ONLY */
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

module.exports = { auth, adminOnly };
