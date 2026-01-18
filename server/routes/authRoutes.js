const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const { auth, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();
console.log("✅ authRoutes loaded");

/* =====================
   ADMIN SIGNUP
===================== */
router.post("/admin-signup", async (req, res) => {
  try {
    const { companyName, email, password, logo } = req.body;

    if (!companyName || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Admin already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const admin = await User.create({
      email,
      password: hashed,
      role: "admin"
    });

    const company = await Company.create({
      name: companyName,
      logo,
      createdBy: admin._id
    });

    admin.companyId = company._id;
    await admin.save();

    res.json({ message: "Company created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =====================
   LOGIN (ADMIN + EMPLOYEE)
===================== */
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email, role });
  if (!user) {
    return res.status(404).json({ message: "Account not found" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  if (user.role === "employee") {
    user.isActive = true;
    await user.save();
  }

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
      companyId: user.companyId
    },
    process.env.JWT_SECRET
  );

  res.json({ token, role: user.role });
});

/* =====================
   CREATE EMPLOYEE (ADMIN)
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
    companyId: req.user.companyId,
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
  }).select("name email isActive profile");

  res.json(employees);
});

/* =====================
   GET COMPANY (ADMIN + EMPLOYEE)
===================== */
router.get("/company", auth, async (req, res) => {
  try {
    const company = await Company.findById(req.user.companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    res.json({
      name: company.name,
      logo: company.logo
    });
  } catch {
    res.status(500).json({ message: "Company fetch failed" });
  }
});

/* =====================
   SAVE PROFILE
===================== */
router.post("/profile", auth, async (req, res) => {
  try {
    const { name, jobRole, avatar } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.profile = { name, jobRole, avatar };
    user.profileCompleted = true;
    await user.save();

    res.json({
      message: "Profile saved",
      role: user.role
    });
  } catch {
    res.status(500).json({ message: "Profile save failed" });
  }
});

// 🔹 GET LOGGED-IN USER PROFILE
// ✅ GET LOGGED IN USER PROFILE
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "role profile profileCompleted"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("ME API ERROR:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});


module.exports = router;
