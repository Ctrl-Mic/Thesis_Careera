import "dotenv/config";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import process from "node:process";
import prisma from "../backend/lib/prisma.js";
import questions from "../backend/services/assessmentQuestions.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

try {
  const dictionaryCategories = await prisma.skillDictionary.findMany({
    select: { assessmentCategory: true },
    distinct: ["assessmentCategory"],
  });
  const questionCategories = new Set(questions.map(({ category }) => category));
  const skillCategories = new Set(
    dictionaryCategories
      .map(({ assessmentCategory }) => assessmentCategory)
      .filter((category) => category !== null),
  );
  const onlyInQuestions = [...questionCategories]
    .filter((category) => !skillCategories.has(category))
    .sort();
  const onlyInSkills = [...skillCategories]
    .filter((category) => !questionCategories.has(category))
    .sort();

  if (onlyInQuestions.length === 0 && onlyInSkills.length === 0) {
    console.log(`No category mismatches (${questionCategories.size} question categories, ${skillCategories.size} skill categories).`);
  } else {
    console.error("Assessment category mismatches:");
    for (const category of onlyInQuestions) {
      console.error(`Only in questions: ${category}`);
    }
    for (const category of onlyInSkills) {
      console.error(`Only in skills_dictionary: ${category}`);
    }
    process.exitCode = 1;
  }
} catch (error) {
  console.error("Could not verify assessment categories against skills_dictionary.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
