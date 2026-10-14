import "dotenv/config";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";
import prisma from "../backend/lib/prisma.js";
import { rebuildUserSkillProfile } from "../backend/services/skillProfileService.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

try {
  const attempts = await prisma.assessmentAttempt.findMany({
    distinct: ["userId"],
    orderBy: { userId: "asc" },
    select: { userId: true },
  });
  const failures = [];
  let rebuiltUsers = 0;
  let rebuiltProfiles = 0;

  for (const { userId } of attempts) {
    try {
      const result = await rebuildUserSkillProfile(userId);
      if (result.rebuilt) {
        rebuiltUsers += 1;
        rebuiltProfiles += result.skillCount;
      }
    } catch (error) {
      failures.push(userId);
      console.error(`Could not rebuild skill profile for user ${userId}.`, error);
    }
  }

  console.log(JSON.stringify({
    usersWithAttempts: attempts.length,
    rebuiltUsers,
    rebuiltProfiles,
    failedUsers: failures,
  }));
  if (failures.length) process.exitCode = 1;
} catch (error) {
  console.error("Could not backfill user skill profiles.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
