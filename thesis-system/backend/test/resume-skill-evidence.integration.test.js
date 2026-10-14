import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import express from "express";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import prisma from "../lib/prisma.js";
import profileRouter from "../routes/profile.js";
import { extractSkills } from "../services/skillMatcher.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

function makePdf(text) {
  const escapedText = text.replace(/[()\\]/g, "\\$&");
  const stream = `BT /F1 12 Tf 72 720 Td (${escapedText}) Tj ET`;
  const objects = text
    ? [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
          + "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`,
      ]
    : [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>",
      ];
  let pdf = "%PDF-1.4\n";
  const offsets = [];
  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "ascii"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "ascii");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}

test("resume uploads replace resume evidence and refresh final weights", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not configured",
}, async () => {
  const userId = randomUUID();
  const email = `resume-evidence-${userId}@example.test`;
  const app = express();
  app.use(express.json());
  app.use("/api", profileRouter);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    await prisma.$connect();
    await prisma.user.create({ data: { id: userId, email } });
    const skills = await prisma.skillDictionary.findMany({
      select: { skillId: true, canonicalSkill: true, synonyms: true },
    });
    assert.ok(skills.length > 1, "the skills dictionary must be seeded");
    const firstSkill = skills.find((entry) => entry.canonicalSkill === "Customer Service");
    const secondSkill = skills.find((entry) => entry.canonicalSkill === "Guest Relations");
    assert.ok(firstSkill && secondSkill, "the test skills must exist in the dictionary");

    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const endpoint = `http://127.0.0.1:${address.port}/api/profile/resume`;
    const uploadContent = async (content, fileName) => fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        fileName,
        contentBase64: content.toString("base64"),
      }),
    });
    const upload = (text, fileName) => uploadContent(makePdf(text), fileName);

    const firstText = `Experienced in ${firstSkill.canonicalSkill}.`;
    const firstResponse = await upload(firstText, "first.pdf");
    assert.equal(firstResponse.status, 200);
    const firstMatches = extractSkills(firstText, skills);
    let profiles = await prisma.userSkillProfile.findMany({ where: { userId } });
    assert.equal(profiles.length, skills.length);
    for (const profile of profiles) {
      const matched = firstMatches.has(profile.skillId);
      assert.equal(profile.inResume, matched);
      assert.equal(profile.assessmentWeight, 0);
      assert.equal(profile.finalWeight, matched ? 0.2 : 0);
    }

    const secondText = `Experienced in ${secondSkill.canonicalSkill}.`;
    const secondResponse = await upload(secondText, "second.pdf");
    assert.equal(secondResponse.status, 200);
    const secondMatches = extractSkills(secondText, skills);
    assert.notDeepEqual([...firstMatches.keys()], [...secondMatches.keys()]);
    profiles = await prisma.userSkillProfile.findMany({ where: { userId } });
    for (const profile of profiles) {
      const matched = secondMatches.has(profile.skillId);
      assert.equal(profile.inResume, matched);
      assert.equal(profile.finalWeight, matched ? 0.2 : 0);
    }

    const failedResponse = await uploadContent(
      Buffer.from("%PDF-1.4\nmalformed document", "ascii"),
      "failed.pdf",
    );
    assert.equal(failedResponse.status, 400);
    profiles = await prisma.userSkillProfile.findMany({ where: { userId } });
    for (const profile of profiles) {
      assert.equal(profile.inResume, false);
      assert.equal(profile.finalWeight, 0);
    }

    const restoreResponse = await upload(firstText, "restore.pdf");
    assert.equal(restoreResponse.status, 200);
    const emptyResponse = await upload("", "scanned.pdf");
    assert.equal(emptyResponse.status, 422);
    const profile = await prisma.profile.findFirst({
      where: { userId },
      select: { resumeText: true },
    });
    assert.equal(profile?.resumeText, null);
    profiles = await prisma.userSkillProfile.findMany({ where: { userId } });
    for (const profile of profiles) {
      assert.equal(profile.inResume, false);
      assert.equal(profile.finalWeight, 0);
    }
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
