import { Router } from "express";
import prisma from "../lib/prisma.js";
import { normalizeEmail } from "../services/authService.js";
import { getAuthUserId } from "../services/sessionService.js";
import { fetchAndStoreJobs } from "../services/jobFetchService.js";
import { importJobListings } from "../services/jobListingImportService.js";

const router = Router();
const studentIdPattern = /^PDM-20\d{2}-\d{6}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const maxImportRows = 5000;

async function requireAdmin(request, response, next) {
  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const userId = getAuthUserId(token);

  if (!userId) {
    return response.status(401).json({ success: false, message: "Sign in to continue." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, isAdmin: true },
  });

  if (!user?.isAdmin) {
    return response.status(403).json({ success: false, message: "Admin access is required." });
  }

  return next();
}

router.get("/admin/users", requireAdmin, async (_request, response) => {
  const users = await prisma.user.findMany({
    select: {
      fullName: true,
      studentId: true,
      email: true,
    },
    orderBy: [{ fullName: "asc" }, { email: "asc" }],
  });

  return response.json({ success: true, users });
});

router.post("/admin/jobs/fetch", requireAdmin, async (request, response) => {
  const keywords = request.body?.keywords;
  const location = request.body?.location;
  if (
    typeof keywords !== "string"
    || !keywords.trim()
    || typeof location !== "string"
    || !location.trim()
  ) {
    return response.status(400).json({
      success: false,
      message: "keywords and location must be non-empty strings.",
    });
  }

  const result = await fetchAndStoreJobs({ keywords, location });
  return response.json({ success: true, ...result });
});

router.post("/admin/job-listings/import", requireAdmin, async (request, response) => {
  const listings = request.body?.listings;
  if (!Array.isArray(listings) || listings.length === 0 || listings.length > maxImportRows) {
    return response.status(400).json({
      success: false,
      message: `Upload a file containing between 1 and ${maxImportRows} job listings.`,
    });
  }

  const result = await importJobListings(listings);
  return response.status(200).json({ success: true, ...result });
});

router.post("/admin/users/import", requireAdmin, async (request, response) => {
  const importedUsers = request.body?.users;
  if (!Array.isArray(importedUsers) || importedUsers.length === 0 || importedUsers.length > maxImportRows) {
    return response.status(400).json({
      success: false,
      message: `Upload a file containing between 1 and ${maxImportRows} users.`,
    });
  }

  const seenEmails = new Set();
  const seenStudentIds = new Set();
  const normalizedUsers = [];

  for (const [index, entry] of importedUsers.entries()) {
    const fullName = String(entry?.fullName ?? "").trim();
    const studentId = String(entry?.studentId ?? "").trim().toUpperCase();
    const email = normalizeEmail(entry?.email);

    if (
      (fullName && fullName.length > 200)
      || !studentIdPattern.test(studentId)
      || (email && !emailPattern.test(email))
    ) {
      return response.status(400).json({
        success: false,
        message: `Row ${index + 2} must include a valid student ID and, if provided, a valid name and email.`,
      });
    }

    if ((email && seenEmails.has(email)) || seenStudentIds.has(studentId)) {
      return response.status(400).json({
        success: false,
        message: `The file contains a duplicate email or student ID at row ${index + 2}.`,
      });
    }

    if (email) seenEmails.add(email);
    seenStudentIds.add(studentId);
    normalizedUsers.push({
      fullName: fullName || null,
      studentId,
      email: email || null,
      passwordHash: null,
    });
  }

  const suppliedEmails = normalizedUsers
    .map((user) => user.email)
    .filter(Boolean);
  const existingUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...(suppliedEmails.length > 0 ? [{ email: { in: suppliedEmails } }] : []),
        { studentId: { in: normalizedUsers.map((user) => user.studentId) } },
      ],
    },
    select: { email: true, studentId: true },
  });
  const existingEmails = new Set(existingUsers.map((user) => user.email).filter(Boolean));
  const existingStudentIds = new Set(existingUsers.map((user) => user.studentId).filter(Boolean));
  const newUsers = normalizedUsers.filter(
    (user) => !existingEmails.has(user.email) && !existingStudentIds.has(user.studentId),
  );

  const result = newUsers.length > 0
    ? await prisma.user.createMany({ data: newUsers, skipDuplicates: true })
    : { count: 0 };

  return response.status(201).json({
    success: true,
    importedCount: result.count,
    skippedCount: normalizedUsers.length - result.count,
  });
});

export default router;
