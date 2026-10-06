import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "../services/authService.js";

const router = Router();

router.post("/register", async (request, response) => {
  const { fullName, email, password } = request.body ?? {};
  const normalizedEmail = normalizeEmail(email);

  if (!fullName || !normalizedEmail || !password) {
    return response.status(400).json({
      success: false,
      message: "Full name, email and password are required.",
    });
  }

  if (password.length < 8) {
    return response.status(400).json({
      success: false,
      message: "Password must contain at least 8 characters.",
    });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    return response.status(409).json({
      success: false,
      message: "An account with this email already exists.",
    });
  }

  const user = await prisma.user.create({
    data: {
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
    },
  });

  return response.status(201).json({
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
  });
});

router.post("/login", async (request, response) => {
  const { email, password } = request.body ?? {};
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return response.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return response.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);

  if (!isPasswordValid) {
    return response.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  return response.json({
    success: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
    },
  });
});

export default router;