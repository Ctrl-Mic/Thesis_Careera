import { randomUUID } from "node:crypto";
import { Router } from "express";
import prisma from "../lib/prisma.js";
import { getAuthUserId } from "../services/sessionService.js";
import questions from "../services/assessmentQuestions.js";
import { rebuildUserSkillProfile } from "../services/skillProfileService.js";

const router = Router();
const questionCategories = new Set(questions.map(({ category }) => category));

async function requireUser(request, response, next) {
  const authorization = request.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const userId = getAuthUserId(token);

  if (!userId) {
    return response.status(401).json({ success: false, message: "Sign in to continue." });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return response.status(401).json({ success: false, message: "Your account could not be found." });
  }

  request.assessmentUserId = user.id;
  return next();
}

function validateAnswers(answers) {
  if (!Array.isArray(answers)) {
    return "Answers must be a list of {category, level} objects.";
  }

  const suppliedCategories = [];
  const invalidLevels = [];

  for (const [index, answer] of answers.entries()) {
    const category = answer?.category;
    if (typeof category === "string") suppliedCategories.push(category);

    if (!Number.isInteger(answer?.level) || answer.level < 0 || answer.level > 5) {
      invalidLevels.push(`answer ${index + 1}`);
    }
  }

  const counts = new Map();
  for (const category of suppliedCategories) {
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  const missing = [...questionCategories].filter((category) => counts.get(category) !== 1);
  const duplicated = [...counts]
    .filter(([, count]) => count > 1)
    .map(([category]) => category);
  const unexpected = [...counts.keys()].filter((category) => !questionCategories.has(category));
  const categoryDetails = [
    missing.length ? `missing or repeated categories: ${missing.join(", ")}` : "",
    duplicated.length ? `duplicate categories: ${duplicated.join(", ")}` : "",
    unexpected.length ? `unexpected categories: ${unexpected.join(", ")}` : "",
    answers.length !== suppliedCategories.length ? "each answer must have a category" : "",
  ].filter(Boolean);
  const levelDetail = invalidLevels.length
    ? `${invalidLevels.join(", ")} must have an integer level from 0 to 5`
    : "";

  if (categoryDetails.length || levelDetail) {
    const categoryMessage = categoryDetails.length
      ? `Answers must include every question category exactly once; ${categoryDetails.join("; ")}.`
      : "";
    return [categoryMessage, levelDetail].filter(Boolean).join(" ");
  }

  return null;
}

router.get("/assessment/questions", (_request, response) => {
  return response.json({ success: true, questions });
});

router.post("/assessment/submit", requireUser, async (request, response) => {
  const answers = request.body;
  const validationMessage = validateAnswers(answers);
  if (validationMessage) {
    return response.status(400).json({ success: false, message: validationMessage });
  }

  const attempt = await prisma.$transaction(async (transaction) => {
    const latestAttempt = await transaction.assessmentAttempt.findFirst({
      where: { userId: request.assessmentUserId },
      orderBy: [{ takenAt: "desc" }, { attemptId: "desc" }],
      select: { takenAt: true },
    });
    const now = new Date();
    const takenAt = latestAttempt && latestAttempt.takenAt >= now
      ? new Date(latestAttempt.takenAt.getTime() + 1)
      : now;
    const createdAttempt = await transaction.assessmentAttempt.create({
      data: {
        attemptId: randomUUID(),
        userId: request.assessmentUserId,
        takenAt,
      },
    });

    await transaction.assessmentAnswer.createMany({
      data: answers.map(({ category, level }) => ({
        attemptId: createdAttempt.attemptId,
        category,
        level,
      })),
    });

    return createdAttempt;
  });

  let warning;
  try {
    await rebuildUserSkillProfile(request.assessmentUserId);
  } catch (error) {
    console.error(
      `Assessment ${attempt.attemptId} was saved, but the skill profile rebuild failed.`,
      error,
    );
    warning = "Your assessment was saved, but your skill profile could not be rebuilt.";
  }

  return response.status(201).json({
    success: true,
    attempt_id: attempt.attemptId,
    ...(warning ? { warning } : {}),
  });
});

router.get("/assessment/latest", requireUser, async (request, response) => {
  const attempt = await prisma.assessmentAttempt.findFirst({
    where: { userId: request.assessmentUserId },
    orderBy: [{ takenAt: "desc" }, { attemptId: "desc" }],
    include: { answers: { select: { category: true, level: true } } },
  });

  return response.json({
    success: true,
    attempt_id: attempt?.attemptId ?? null,
    answers: attempt?.answers ?? [],
  });
});

export default router;
