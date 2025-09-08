import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();

/**
 * POST /api/auth/login
 * body: { username, password }
 * returns: { token, user }
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Username i lozinka su obavezni." });
    }

    const user = await User.findOne({ username, isActive: true }).lean();
    if (!user)
      return res.status(401).json({ error: "Neispravni kredencijali." });

    // password check
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Neispravni kredencijali." });

    const token = jwt.sign(
      { sub: user._id.toString(), username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    // vrati bez passwordHash
    const { passwordHash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Login greška" });
  }
});

export default router;
