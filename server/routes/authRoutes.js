const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const { auth, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

/* 🔐 STRONG PASSWORD */
const isStrongPassword = (password) => {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
};

/* =====================
   ADMIN SIGNUP
===================== */
router.post("/admin-signup", async (req, res) => {
  try {
    const { companyName, email, password, logo } = req.body;

    if (!companyName || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await User.create({
      email,
      password: hashed,
      role: "admin"
    });

    // ✅ SAVE LOGO IN COMPANY
    const company = await Company.create({
      name: companyName,
      logo: logo || null,
      createdBy: admin._id
    });

    admin.companyId = company._id;
    await admin.save();

    res.json({ message: "Company created successfully" });
  } catch (err) {
    console.error("ADMIN SIGNUP ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});





/* =====================
   LOGIN (ADMIN + EMPLOYEE)
===================== */
router.post("/login", async (req, res) => {
    console.log("🔥 LOGIN HIT:", req.body);
  const { email, password, role } = req.body;

  const user = await User.findOne({ email, role });
  if (!user) {
    return res.status(404).json({ message: "Account not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  // ✅ mark employee active
  if (user.role === "employee") {
    user.isActive = true;
    await user.save();
  }

  const token = jwt.sign(
    { id: user._id, role: user.role, companyId: user.companyId },
    process.env.JWT_SECRET
  );

  res.json({ token, role: user.role });
});



/* =====================
   CREATE EMPLOYEE
===================== */
router.post("/create-employee", auth, adminOnly, async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(400).json({ message: "Employee already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
  name,
  email,
  password: hashed,
  role: "employee",
  companyId: req.user.companyId, // 🔴 THIS MUST EXIST
  isActive: false
});

  res.json({ message: "Employee created" });
});


/* =====================
   GET EMPLOYEES (ADMIN)
===================== */
router.get("/employees", auth, adminOnly, async (req, res) => {
  const employees = await User.find({
    companyId: req.user.companyId,
    role: "employee"
  }).select("name email isActive");

  res.json(employees);
});

// ✅ GET COMPANY DETAILS (Admin)
router.get("/company", authMiddleware, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) return res.status(404).json({ message: "Company not found" });

    res.json({
      name: company.companyName,
      logo: company.logo
    });
  } catch (err) {
    res.status(500).json({ message: "Company fetch failed" });
  }
});


module.exports = router;
