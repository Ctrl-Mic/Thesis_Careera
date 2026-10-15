import { Router } from "express";
import { Buffer } from "node:buffer";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import prisma from "../lib/prisma.js";
import { normalizeEmail } from "../services/authService.js";
import { getAuthUserId } from "../services/sessionService.js";
import { findSkillMatches } from "../services/skillMatcher.js";
import { replaceUserSkillEvidence } from "../services/skillProfileService.js";

const router = Router();
const maxResumeSize = 5 * 1024 * 1024;
function getResumeContent(fileName, contentBase64) {
  if (typeof fileName !== "string" || !fileName.trim()) return null;

  const extension = path.extname(fileName).toLowerCase();

  if (extension !== ".pdf" || typeof contentBase64 !== "string") {
    return null;
  }

  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
    return null;
  }

  const content = Buffer.from(contentBase64, "base64");
  if (content.length === 0 || content.length > maxResumeSize) return null;

  if (content.subarray(0, 5).toString("ascii") !== "%PDF-") return null;

  return {
    content,
    mimeType: "application/pdf",
  };
}

async function extractResumeText(content) {
  const parser = new PDFParse({ data: content });
  try {
    return (await parser.getText()).text
      .replace(/--\s*\d+\s+of\s+\d+\s*--/g, "")
      .trim();
  } finally {
    await parser.destroy();
  }
}

async function requireProfileUser(request, response, next) {
  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const userId = getAuthUserId(token);
  if (!userId) {
    return response.status(401).json({ success: false, message: "Sign in to continue." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, fullName: true },
  });
  if (!user) {
    return response.status(401).json({ success: false, message: "Your account could not be found." });
  }

  request.profileUser = user;
  return next();
}

function hasMatchingEmail(request, response) {
  const requestedEmail = request.method === "POST"
    ? request.body?.email
    : request.query.email;
  if (
    typeof requestedEmail !== "string"
    || normalizeEmail(requestedEmail) !== normalizeEmail(request.profileUser.email)
  ) {
    response.status(403).json({ success: false, message: "You can only access your own profile." });
    return false;
  }
  return true;
}

async function updateResumeEvidence(userId, text) {
  const skills = await prisma.skillDictionary.findMany({
    select: { skillId: true, canonicalSkill: true, synonyms: true },
  });
  const matches = findSkillMatches(text, skills);
  return replaceUserSkillEvidence(userId, matches.keys(), "resume");
}

router.get("/profile", requireProfileUser, async (request, response) => {
  if (!hasMatchingEmail(request, response)) return undefined;
  const user = request.profileUser;

  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    orderBy: { profileId: "asc" },
  });

  return response.json({
    success: true,
    user: { fullName: user.fullName, email: user.email },
    resume: profile?.resumeFile
      ? {
          name: profile.resumeFileName,
          mimeType: profile.resumeMimeType,
          uploadedAt: profile.resumeUploadedAt,
        }
      : null,
  });
});

router.post("/profile/resume", requireProfileUser, async (request, response) => {
  if (!hasMatchingEmail(request, response)) return undefined;
  const user = request.profileUser;

  const { fileName, contentBase64 } = request.body ?? {};
  const resume = getResumeContent(fileName, contentBase64);
  if (!resume) {
    return response.status(400).json({
      success: false,
      message: "Choose a valid PDF resume under 5 MB.",
    });
  }

  let extractedText;
  try {
    extractedText = await extractResumeText(resume.content);
  } catch (error) {
    console.error("Could not extract text from uploaded resume PDF.", error);
    await prisma.profile.updateMany({
      where: { userId: user.id },
      data: { resumeText: null },
    });
    await updateResumeEvidence(user.id, "");
    return response.status(400).json({
      success: false,
      message: "Could not read this PDF. Upload a valid, text-based PDF.",
    });
  }

  if (!extractedText || !/[\p{L}\p{N}]/u.test(extractedText)) {
    console.warn(`Resume PDF for user ${user.id} contained no selectable text.`);
    await prisma.profile.updateMany({
      where: { userId: user.id },
      data: { resumeText: null },
    });
    await updateResumeEvidence(user.id, "");
    return response.status(422).json({
      success: false,
      message: "No selectable text was found. Upload a text-based PDF.",
    });
  }

  const uploadedAt = new Date();
  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    orderBy: { profileId: "asc" },
  });
  const resumeData = {
    resumeFile: resume.content,
    resumeText: { text: extractedText },
    resumeFileName: path.basename(fileName),
    resumeMimeType: resume.mimeType,
    resumeUploadedAt: uploadedAt,
  };

  if (profile) {
    await prisma.profile.update({ where: { profileId: profile.profileId }, data: resumeData });
  } else {
    await prisma.profile.create({ data: { userId: user.id, ...resumeData } });
  }
  await updateResumeEvidence(user.id, extractedText);

  return response.json({
    success: true,
    resume: { name: path.basename(fileName), mimeType: resume.mimeType, uploadedAt },
  });
});

router.get("/profile/resume", requireProfileUser, async (request, response) => {
  if (!hasMatchingEmail(request, response)) return undefined;
  const user = request.profileUser;

  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    orderBy: { profileId: "asc" },
  });
  if (!profile?.resumeFile) {
    return response.status(404).json({ success: false, message: "No resume uploaded." });
  }

  response.set({
    "Content-Type": profile.resumeMimeType ?? "application/octet-stream",
    "Content-Disposition": `attachment; filename="${encodeURIComponent(profile.resumeFileName ?? "resume")}"`,
  });
  return response.send(profile.resumeFile);
});

router.delete("/profile/resume", requireProfileUser, async (request, response) => {
  if (!hasMatchingEmail(request, response)) return undefined;
  const user = request.profileUser;

  await prisma.profile.updateMany({
    where: { userId: user.id },
    data: {
      resumeFile: null,
      resumeText: null,
      resumeFileName: null,
      resumeMimeType: null,
      resumeUploadedAt: null,
    },
  });
  await updateResumeEvidence(user.id, "");

  return response.json({ success: true });
});

export default router;