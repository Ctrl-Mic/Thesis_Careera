import { Router } from "express";
import prisma from "../lib/prisma.js";
import {
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from "../services/authService.js";
import {
  createPendingRegistration,
  hasPendingRegistrationEmail,
} from "../services/pendingRegistrationService.js";
import { createAuthToken } from "../services/sessionService.js";

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeFullName = (fullName) => String(fullName ?? "")
  .trim()
  .replace(/\s+/g, " ")
  .toLowerCase();

router.post("/register", async (request, response) => {
  const { fullName, studentId, email, password } = request.body ?? {};
  const normalizedFullName = String(fullName ?? "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedStudentId = String(studentId ?? "").trim().toUpperCase();

  if (
    !normalizedFullName
    || normalizedFullName.length > 200
    || !normalizedStudentId
    || !normalizedEmail
    || !password
  ) {
    return response.status(400).json({
      success: false,
      message: "Full name, student ID, email and password are required.",
    });
  }

  if (!/^PDM-20\d{2}-\d{6}$/.test(normalizedStudentId)) {
    return response.status(400).json({
      success: false,
      message: "Student ID must match the format PDM-20XX-XXXXXX.",
    });
  }

  if (!emailPattern.test(normalizedEmail)) {
    return response.status(400).json({
      success: false,
      message: "Please enter a valid email address.",
    });
  }

  if (typeof password !== "string" || password.length < 8) {
    return response.status(400).json({
      success: false,
      message: "Password must contain at least 8 characters.",
    });
  }

  const existingStudent = await prisma.user.findFirst({
    where: { studentId: normalizedStudentId },
  });

  if (!existingStudent) {
    return response.status(403).json({
      success: false,
      message: "Student ID was not found. Please contact your administrator.",
    });
  }

  if (normalizeFullName(normalizedFullName) !== normalizeFullName(existingStudent.fullName)) {
    return response.status(403).json({
      success: false,
      message: "The full name does not match the student ID in our records.",
    });
  }

  const existingEmailUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingEmailUser && existingEmailUser.id !== existingStudent.id) {
    return response.status(409).json({
      success: false,
      message: "An account with this email already exists.",
    });
  }

  if (existingStudent.passwordHash) {
    return response.status(409).json({
      success: false,
      message: "An account with this student ID already exists.",
    });
  }

  if (hasPendingRegistrationEmail(normalizedEmail)) {
    return response.status(409).json({
      success: false,
      message: "An account with this email is already being registered.",
    });
  }

  const passwordHash = await hashPassword(password);
  const token = createPendingRegistration({
    userId: existingStudent.id,
    email: normalizedEmail,
    passwordHash,
  });

  return response.status(202).json({
    success: true,
    registrationPending: true,
    message: "Complete both verification steps to create your account.",
    token,
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

  if (!user?.passwordHash) {
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
      isAdmin: user.isAdmin,
    },
    verificationRequired: !user.isVerified,
    token: createAuthToken(user.id),
  });
});

export default router;