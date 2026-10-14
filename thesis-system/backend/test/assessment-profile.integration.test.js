import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import process from "node:process";
import test from "node:test";
import prisma from "../lib/prisma.js";
import assessmentRouter from "../routes/assessment.js";
import questions from "../services/assessmentQuestions.js";
import { createAuthToken } from "../services/sessionService.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

test("assessment submissions create and update one profile row per skill", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not configured",
}, async () => {
  const userId = randomUUID();
  const app = express();
  app.use(express.json());
  app.use("/api", assessmentRouter);
  const server = app.listen(0, "127.0.0.1");

  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    await prisma.$connect();
    await prisma.user.create({ data: { id: userId } });
    const skills = await prisma.skillDictionary.findMany({
      select: { skillId: true, assessmentCategory: true },
    });
    assert.ok(skills.length > 0, "the skills dictionary must be seeded");

    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const endpoint = `http://127.0.0.1:${address.port}/api/assessment/submit`;
    const token = createAuthToken(userId);
    const submit = async (customerServiceLevel) => fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(questions.map(({ category }) => ({
        category,
        level: category === "Customer and Personal Service"
          ? customerServiceLevel
          : 2,
      }))),
    });

    const firstResponse = await submit(4);
    assert.equal(firstResponse.status, 201);
    const firstBody = await firstResponse.json();
    assert.equal(firstBody.success, true);

    const expectedCount = await prisma.skillDictionary.count();
    const firstProfiles = await prisma.userSkillProfile.findMany({
      where: { userId },
      include: { skill: { select: { assessmentCategory: true } } },
    });
    assert.equal(firstProfiles.length, expectedCount);
    for (const profile of firstProfiles) {
      const expectedWeight =
        profile.skill.assessmentCategory === "Customer and Personal Service"
          ? 0.8
          : 0.4;
      assert.ok(Math.abs(profile.assessmentWeight - expectedWeight) < 1e-6);
      assert.ok(Math.abs(profile.finalWeight - expectedWeight) < 1e-6);
    }
    const customerServiceProfile = firstProfiles.find(
      (profile) => profile.skill.assessmentCategory === "Customer and Personal Service",
    );
    assert.ok(customerServiceProfile);
    await prisma.userSkillProfile.update({
      where: {
        userId_skillId: {
          userId,
          skillId: customerServiceProfile.skillId,
        },
      },
      data: { inResume: true, inCertificate: true },
    });

    const secondResponse = await submit(1);
    assert.equal(secondResponse.status, 201);
    const secondProfiles = await prisma.userSkillProfile.findMany({
      where: { userId },
      include: { skill: { select: { assessmentCategory: true } } },
    });
    assert.equal(secondProfiles.length, expectedCount);
    for (const profile of secondProfiles) {
      const expectedWeight =
        profile.skill.assessmentCategory === "Customer and Personal Service"
          ? 0.2
          : 0.4;
      assert.ok(Math.abs(profile.assessmentWeight - expectedWeight) < 1e-6);
      const expectedFinalWeight = expectedWeight
        + (profile.inResume ? 0.2 : 0)
        + (profile.inCertificate ? 0.2 : 0);
      assert.ok(Math.abs(profile.finalWeight - Math.min(1, expectedFinalWeight)) < 1e-6);
    }
    const updatedCustomerProfile = secondProfiles.find(
      (profile) => profile.skillId === customerServiceProfile.skillId,
    );
    assert.equal(updatedCustomerProfile.inResume, true);
    assert.equal(updatedCustomerProfile.inCertificate, true);
  } finally {
    await prisma.user.deleteMany({ where: { id: userId } });
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
