const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Company = require("../models/Company");
const { auth, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();
const isStrongPassword = (password) => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  return regex.test(password);
};

/* ADMIN SIGN UP */
router.post("/admin-signup", async (req, res) => {
  const { companyName, email, password } = req.body;

  if (!companyName || !email || !password) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  if (!isStrongPassword(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
    });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({
      message: "Admin account already exists"
    });
  }

  const hashed = await bcrypt.hash(password, 10);

  const admin = await User.create({
    email,
    password: hashed,
    role: "admin"
  });

  const company = await Company.create({
    name: companyName,
    createdBy: admin._id
  });

  admin.companyId = company._id;
  await admin.save();

  res.json({ message: "Company account created successfully" });
});


/* LOGIN (ADMIN + EMPLOYEE) */
router.post("/login", async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required"
    });
  }

  const user = await User.findOne({ email, role });
  if (!user) {
    return res.status(404).json({
      message: "Account not found for this role"
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid email or password"
    });
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

router.post("/create-employee", auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    // 🔐 Strong password validation
    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        message:
          "Password must be strong (8 chars, uppercase, lowercase, number, special character)"
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Employee already exists"
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await User.create({
      name,
      email,
      password: hashed,
      role: "employee",
      companyId: req.user.companyId
    });

    res.json({ message: "Employee created successfully" });
  } catch (error) {
    console.error("CREATE EMPLOYEE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
});


router.get("/employees", auth, adminOnly, async (req, res) => {
  const employees = await User.find({
    companyId: req.user.companyId,
    role: "employee"
  }).select("name email");

  res.json(employees);
});
