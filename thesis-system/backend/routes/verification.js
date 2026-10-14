import { Router } from "express";
import { appendFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../lib/prisma.js";
import {
  getPendingRegistration,
  removePendingRegistration,
} from "../services/pendingRegistrationService.js";
import { createAuthToken, getAuthUserId } from "../services/sessionService.js";
import {
  getPendingFaceVector,
  isValidFaceVector,
  matchesFace,
  nameAppearsInText,
  parseImageDataUrl,
  removePendingFaceVector,
  requestFaceAnalysis,
  setPendingFaceVector,
} from "../services/verificationService.js";

const router = Router();
const studentIdPattern = /^PDM-20\d{2}-\d{6}$/;
const diagnosticsPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../verification-errors.log",
);

async function requireUser(request, response, next) {
  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const pendingRegistration = getPendingRegistration(token);
  const userId = pendingRegistration?.userId ?? getAuthUserId(token);
  if (!userId) {
    return response.status(401).json({ success: false, message: "Sign in to continue." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      studentId: true,
      passwordHash: true,
      isVerified: true,
    },
  });
  if (!user) {
    return response.status(401).json({ success: false, message: "Your account could not be found." });
  }

  request.verificationUser = user;
  request.pendingRegistration = pendingRegistration;
  request.verificationToken = token;
  return next();
}

router.get("/verification/status", requireUser, (request, response) => {
  return response.json({
    success: true,
    isVerified: Boolean(request.verificationUser.passwordHash && request.verificationUser.isVerified),
  });
});

function getImage(request, response) {
  const image = parseImageDataUrl(request.body?.image);
  if (!image) {
    response.status(400).json({
      success: false,
      message: "Upload a valid JPG, PNG or WEBP image smaller than 5 MB.",
    });
    return null;
  }
  return image;
}

function writeVerificationDiagnostic(operation, details) {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    operation,
    ...details,
  };

  console.error("Verification diagnostic:", diagnostic);
  try {
    appendFileSync(diagnosticsPath, `${JSON.stringify(diagnostic)}\n`, "utf8");
  } catch (error) {
    console.error(`Could not write verification diagnostics to ${diagnosticsPath}:`, error);
  }
}

function handleAnalysisError(response, operation, endpoint, error) {
  writeVerificationDiagnostic(operation, {
    endpoint,
    upstreamStatus: error.status ?? null,
    upstreamContentType: error.contentType ?? null,
    errorName: error.name,
    message: error.message,
    causeMessage: error.cause?.message ?? null,
    causeCode: error.cause?.code ?? null,
    causeAddress: error.cause?.address ?? null,
    causePort: error.cause?.port ?? null,
  });

  if (error.status === 400 || error.status === 413 || error.status === 422) {
    return response.status(422).json({ success: false, message: error.message });
  }

  const message = error.message.includes("INSIGHTFACE_API_KEY")
    ? "The verification service is not configured."
    : "The verification service is unavailable. Please try again.";
  return response.status(503).json({ success: false, message });
}

router.post("/verification/student-id", requireUser, async (request, response) => {
  const user = request.verificationUser;
  if (user.isVerified && !request.pendingRegistration) {
    return response.status(409).json({ success: false, message: "This account is already verified." });
  }
  if (request.pendingRegistration && user.passwordHash) {
    removePendingRegistration(request.verificationToken);
    return response.status(409).json({
      success: false,
      message: "This student ID has already been registered.",
    });
  }
  if (!user.fullName || !user.studentId) {
    return response.status(409).json({
      success: false,
      message: "Your registered name and student ID are required for verification.",
    });
  }

  const image = getImage(request, response);
  if (!image) return undefined;

  removePendingFaceVector(user.id);
  let result;
  try {
    result = await requestFaceAnalysis("extract", image.base64);
  } catch (error) {
    return handleAnalysisError(response, "Student ID analysis", "extract", error);
  }

  const extractedStudentId = String(result.studentId ?? "").replace(/\s+/g, "").toUpperCase();
  const expectedStudentId = user.studentId.replace(/\s+/g, "").toUpperCase();
  const sameId = studentIdPattern.test(extractedStudentId)
    && extractedStudentId === expectedStudentId;
  const sameName = nameAppearsInText(user.fullName, result.fullName)
    || nameAppearsInText(user.fullName, result.text);

  if (!sameId || !sameName) {
    writeVerificationDiagnostic("Student ID comparison rejected", {
      registeredName: user.fullName,
      registeredStudentId: user.studentId,
      readName: result.fullName ?? "",
      readStudentId: result.studentId ?? "",
      nameMatched: sameName,
      studentIdMatched: sameId,
    });
    return response.status(422).json({
      success: false,
      message: "The name and student ID on the uploaded card must match your registration.",
    });
  }
  if (!isValidFaceVector(result.faceVector)) {
    writeVerificationDiagnostic("Student ID face check rejected", {
      registeredName: user.fullName,
      registeredStudentId: user.studentId,
      readName: result.fullName ?? "",
      readStudentId: result.studentId ?? "",
      nameMatched: sameName,
      studentIdMatched: sameId,
      faceVectorValid: false,
    });
    return response.status(422).json({
      success: false,
      message: "A clear student photo could not be detected on this ID. Upload a sharper image.",
    });
  }

  setPendingFaceVector(user.id, result.faceVector);
  return response.json({ success: true, idVerified: true });
});

router.post("/verification/face", requireUser, async (request, response) => {
  const user = request.verificationUser;
  if (user.isVerified && !request.pendingRegistration) {
    return response.status(409).json({ success: false, message: "This account is already verified." });
  }
  if (request.pendingRegistration && user.passwordHash) {
    removePendingRegistration(request.verificationToken);
    removePendingFaceVector(user.id);
    return response.status(409).json({
      success: false,
      message: "This student ID has already been registered.",
    });
  }

  const referenceVector = getPendingFaceVector(user.id);
  if (!referenceVector) {
    return response.status(409).json({
      success: false,
      message: "Verify your student ID again before starting camera verification.",
    });
  }

  const image = getImage(request, response);
  if (!image) return undefined;

  let result;
  try {
    result = await requestFaceAnalysis("face-vector", image.base64);
  } catch (error) {
    return handleAnalysisError(response, "Camera face analysis", "face-vector", error);
  }

  const faceMatched = matchesFace(referenceVector, result.faceVector);
  if (!faceMatched) {
    writeVerificationDiagnostic("Camera face comparison rejected", {
      faceMatched,
      faceVectorValid: isValidFaceVector(result.faceVector),
    });
    return response.status(422).json({
      success: false,
      message: "The camera image did not match the face on your student ID. Try again.",
    });
  }

  if (request.pendingRegistration) {
    try {
      const claimResult = await prisma.user.updateMany({
        where: { id: user.id, passwordHash: null },
        data: {
          email: request.pendingRegistration.email,
          passwordHash: request.pendingRegistration.passwordHash,
          isVerified: true,
        },
      });

      if (claimResult.count !== 1) {
        removePendingRegistration(request.verificationToken);
        removePendingFaceVector(user.id);
        return response.status(409).json({
          success: false,
          message: "This student ID has already been registered.",
        });
      }

      const registeredUser = await prisma.user.findUniqueOrThrow({
        where: { id: user.id },
      });
      removePendingRegistration(request.verificationToken);
      removePendingFaceVector(user.id);

      return response.json({
        success: true,
        faceVerified: true,
        registrationComplete: true,
        user: {
          id: registeredUser.id,
          fullName: registeredUser.fullName,
          email: registeredUser.email,
          isAdmin: registeredUser.isAdmin,
        },
        token: createAuthToken(registeredUser.id),
      });
    } catch (error) {
      if (error?.code === "P2002") {
        removePendingRegistration(request.verificationToken);
        removePendingFaceVector(user.id);
        return response.status(409).json({
          success: false,
          message: "An account with this email or student ID already exists.",
        });
      }
      throw error;
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true },
  });
  removePendingFaceVector(user.id);

  return response.json({ success: true, faceVerified: true });
});

export default router;