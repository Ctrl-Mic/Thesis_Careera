import "dotenv/config";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";
import prisma from "../backend/lib/prisma.js";
import { findSkillMatches } from "../backend/services/skillMatcher.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const [userId] = process.argv.slice(2);
if (!userId) {
  console.error("Usage: node scripts/match-skills.js <userId>");
  process.exitCode = 1;
} else {
  try {
    const profile = await prisma.profile.findFirst({
      where: { userId },
      orderBy: { profileId: "asc" },
      select: { resumeText: true },
    });
    const text = profile?.resumeText?.text;
    if (typeof text !== "string") {
      console.log(`No extracted resume text found for user ${userId}.`);
    } else {
      const skills = await prisma.skillDictionary.findMany({
        select: { skillId: true, canonicalSkill: true, synonyms: true },
        orderBy: { skillId: "asc" },
      });
      const matches = findSkillMatches(text, skills);
      const skillsById = new Map(skills.map((skill) => [skill.skillId, skill]));
      const output = [...matches].map(([skillId, match]) => ({
        skillId,
        skill: skillsById.get(skillId)?.canonicalSkill,
        matchCount: match.matchCount,
        matchedTerms: match.matchedTerms,
      }));
      console.log(JSON.stringify(output, null, 2));
    }
  } catch (error) {
    console.error(`Could not match resume skills for user ${userId}.`, error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}
