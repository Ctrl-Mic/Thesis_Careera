import { Router } from "express";
import { Buffer } from "node:buffer";
import path from "node:path";
import prisma from "../lib/prisma.js";
import { normalizeEmail } from "../services/authService.js";

const router = Router();
const maxResumeSize = 5 * 1024 * 1024;
const resumeExtensions = new Set([".pdf", ".doc", ".docx"]);

function getResumeContent(fileName, contentBase64) {
  if (typeof fileName !== "string" || !fileName.trim()) return null;

  const extension = path.extname(fileName).toLowerCase();

  if (!resumeExtensions.has(extension) || typeof contentBase64 !== "string") {
    return null;
  }

  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(contentBase64)) {
    return null;
  }

  const content = Buffer.from(contentBase64, "base64");
  if (content.length === 0 || content.length > maxResumeSize) return null;

  const signatures = {
    ".pdf": content.subarray(0, 5).toString("ascii") === "%PDF-",
    ".doc": content.subarray(0, 8).equals(Buffer.from("D0CF11E0A1B11AE1", "hex")),
    ".docx": content.subarray(0, 4).equals(Buffer.from("504B0304", "hex")),
  };

  if (!signatures[extension]) return null;

  return {
    content,
    mimeType: extension === ".pdf"
      ? "application/pdf"
      : extension === ".doc"
        ? "application/msword"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  return prisma.user.findUnique({ where: { email: normalizedEmail } });
}

router.get("/profile", async (request, response) => {
  const user = await findUserByEmail(request.query.email);
  if (!user) {
    return response.status(404).json({ success: false, message: "User not found." });
  }

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

router.post("/profile/resume", async (request, response) => {
  const user = await findUserByEmail(request.body?.email);
  if (!user) {
    return response.status(404).json({ success: false, message: "User not found." });
  }

  const { fileName, contentBase64 } = request.body ?? {};
  const resume = getResumeContent(fileName, contentBase64);
  if (!resume) {
    return response.status(400).json({
      success: false,
      message: "Choose a valid PDF, DOC, or DOCX resume under 5 MB.",
    });
  }

  const uploadedAt = new Date();
  const profile = await prisma.profile.findFirst({
    where: { userId: user.id },
    orderBy: { profileId: "asc" },
  });
  const resumeData = {
    resumeFile: resume.content,
    resumeFileName: path.basename(fileName),
    resumeMimeType: resume.mimeType,
    resumeUploadedAt: uploadedAt,
  };

  if (profile) {
    await prisma.profile.update({ where: { profileId: profile.profileId }, data: resumeData });
  } else {
    await prisma.profile.create({ data: { userId: user.id, ...resumeData } });
  }

  return response.json({
    success: true,
    resume: { name: path.basename(fileName), mimeType: resume.mimeType, uploadedAt },
  });
});

router.get("/profile/resume", async (request, response) => {
  const user = await findUserByEmail(request.query.email);
  if (!user) {
    return response.status(404).json({ success: false, message: "User not found." });
  }

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

router.delete("/profile/resume", async (request, response) => {
  const user = await findUserByEmail(request.query.email);
  if (!user) {
    return response.status(404).json({ success: false, message: "User not found." });
  }

  await prisma.profile.updateMany({
    where: { userId: user.id },
    data: {
      resumeFile: null,
      resumeFileName: null,
      resumeMimeType: null,
      resumeUploadedAt: null,
    },
  });

  return response.json({ success: true });
});

export default router;