import { Prisma } from "@prisma/client";
import prisma from "../lib/prisma.js";

export function computeFinalWeight(assessmentWeight, inResume, inCertificate) {
  return Math.min(
    1,
    assessmentWeight + 0.2 * Number(inResume) + 0.2 * Number(inCertificate),
  );
}

export async function replaceUserSkillEvidence(
  userId,
  matchedSkillIds,
  evidenceType,
  database = prisma,
) {
  if (evidenceType !== "resume" && evidenceType !== "certificate") {
    throw new Error(`Unsupported skill evidence type: ${evidenceType}`);
  }

  const matched = new Set(matchedSkillIds);
  const evidenceColumn = evidenceType === "resume" ? "in_resume" : "in_certificate";

  return database.$transaction(async (transaction) => {
    const [skills, existingProfiles, latestAttempt] = await Promise.all([
      transaction.skillDictionary.findMany({
        select: { skillId: true, assessmentCategory: true },
      }),
      transaction.userSkillProfile.findMany({
        where: { userId },
        select: {
          skillId: true,
          assessmentWeight: true,
          inResume: true,
          inCertificate: true,
        },
      }),
      transaction.assessmentAttempt.findFirst({
        where: { userId },
        orderBy: [{ takenAt: "desc" }, { attemptId: "desc" }],
        include: { answers: { select: { category: true, level: true } } },
      }),
    ]);

    const existingBySkill = new Map(
      existingProfiles.map((profile) => [profile.skillId, profile]),
    );
    const answersByCategory = new Map(
      (latestAttempt?.answers ?? []).map(({ category, level }) => [category, level]),
    );
    const updatedAt = new Date();
    const rows = skills.map((skill) => {
      const previous = existingBySkill.get(skill.skillId);
      const assessmentLevel = answersByCategory.get(skill.assessmentCategory);
      const assessmentWeight = latestAttempt
        ? previous?.assessmentWeight ?? (assessmentLevel ?? 0) / 5
        : 0;
      const inResume = evidenceType === "resume"
        ? matched.has(skill.skillId)
        : previous?.inResume ?? false;
      const inCertificate = evidenceType === "certificate"
        ? matched.has(skill.skillId)
        : previous?.inCertificate ?? false;

      return {
        skillId: skill.skillId,
        assessmentWeight,
        inResume,
        inCertificate,
        finalWeight: computeFinalWeight(assessmentWeight, inResume, inCertificate),
      };
    });
    const values = rows.map((row) => Prisma.sql`(
      ${userId}::uuid,
      ${row.skillId},
      ${row.assessmentWeight},
      ${row.inResume},
      ${row.inCertificate},
      ${row.finalWeight},
      ${updatedAt}
    )`);

    if (values.length > 0) {
      const evidenceColumnSql = Prisma.raw(`"${evidenceColumn}"`);
      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "user_skill_profile" (
          "user_id", "skill_id", "assessment_weight", "in_resume",
          "in_certificate", "final_weight", "updated_at"
        )
        VALUES ${Prisma.join(values)}
        ON CONFLICT ("user_id", "skill_id") DO UPDATE SET
          "assessment_weight" = EXCLUDED."assessment_weight",
          ${evidenceColumnSql} = EXCLUDED.${evidenceColumnSql},
          "final_weight" = EXCLUDED."final_weight",
          "updated_at" = EXCLUDED."updated_at"
      `);
    }

    return {
      skillCount: skills.length,
      matchedCount: rows.filter((row) => (
        evidenceType === "resume" ? row.inResume : row.inCertificate
      )).length,
    };
  });
}

export async function rebuildUserSkillProfile(userId, database = prisma) {
  return database.$transaction(async (transaction) => {
    const latestAttempt = await transaction.assessmentAttempt.findFirst({
      where: { userId },
      orderBy: [{ takenAt: "desc" }, { attemptId: "desc" }],
      include: { answers: { select: { category: true, level: true } } },
    });

    if (!latestAttempt) {
      return { rebuilt: false, reason: "no_assessment_attempt", skillCount: 0 };
    }

    const skills = await transaction.skillDictionary.findMany({
      select: { skillId: true, assessmentCategory: true },
    });
    const answersByCategory = new Map(
      latestAttempt.answers.map(({ category, level }) => [category, level]),
    );
    const missingCategories = new Set();
    const updatedAt = new Date();
    const profileRows = skills.map((skill) => {
      const category = skill.assessmentCategory;
      const level = category ? answersByCategory.get(category) : undefined;
      if (level === undefined) missingCategories.add(category ?? "(null)");

      const assessmentWeight = (level ?? 0) / 5;
      const finalWeight = computeFinalWeight(assessmentWeight, false, false);
      return Prisma.sql`(
        ${userId}::uuid,
        ${skill.skillId},
        ${assessmentWeight},
        FALSE,
        FALSE,
        ${finalWeight},
        ${updatedAt}
      )`;
    });

    if (profileRows.length) {
      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO "user_skill_profile" (
          "user_id", "skill_id", "assessment_weight", "in_resume",
          "in_certificate", "final_weight", "updated_at"
        )
        VALUES ${Prisma.join(profileRows)}
        ON CONFLICT ("user_id", "skill_id") DO UPDATE SET
          "assessment_weight" = EXCLUDED."assessment_weight",
          "final_weight" = LEAST(
            1.0,
            EXCLUDED."assessment_weight"
              + CASE WHEN "user_skill_profile"."in_resume" THEN 0.2 ELSE 0.0 END
              + CASE WHEN "user_skill_profile"."in_certificate" THEN 0.2 ELSE 0.0 END
          ),
          "updated_at" = EXCLUDED."updated_at"
      `);
    }

    for (const category of missingCategories) {
      console.warn(
        `No assessment answer found for skill category "${category}"; using assessment weight 0.`,
      );
    }

    return {
      rebuilt: true,
      attemptId: latestAttempt.attemptId,
      skillCount: skills.length,
    };
  });
}
