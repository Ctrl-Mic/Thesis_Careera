import "dotenv/config";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Prisma } from "@prisma/client";
import prisma from "../../backend/lib/prisma.js";

function parseCsv(csv) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];

    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && csv[index + 1] === "\n") {
        index += 1;
      }
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("Unterminated quoted field in skills_dictionary.csv");
  }

  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}

const csvPath = fileURLToPath(new URL("./skills_dictionary.csv", import.meta.url));
const records = parseCsv(await readFile(csvPath, "utf8"));
const [header, ...skills] = records;
const expectedHeader = [
  "skill_id",
  "canonical_skill",
  "synonyms",
  "assessment_category",
];

if (
  !header ||
  header.length !== expectedHeader.length ||
  header.some((column, index) => column !== expectedHeader[index])
) {
  throw new Error("Unexpected skills_dictionary.csv header");
}

if (skills.some((skill) => skill.length !== expectedHeader.length)) {
  throw new Error("Malformed row in skills_dictionary.csv");
}

if (skills.length !== 72) {
  throw new Error(`Expected 72 skills in skills_dictionary.csv, found ${skills.length}`);
}

try {
  const values = skills.map(
    ([skillId, canonicalSkill, synonyms, assessmentCategory]) => Prisma.sql`
      (${skillId}, ${canonicalSkill}, ${synonyms}, ${assessmentCategory})
    `,
  );
  const inserted = await prisma.$executeRaw`
    INSERT INTO "skills_dictionary"
      ("skill_id", "canonical_skill", "synonyms", "assessment_category")
    VALUES ${Prisma.join(values)}
    ON CONFLICT ("skill_id") DO NOTHING
  `;
  console.log(`Seeded ${inserted} of ${skills.length} skills.`);
} finally {
  await prisma.$disconnect();
}
