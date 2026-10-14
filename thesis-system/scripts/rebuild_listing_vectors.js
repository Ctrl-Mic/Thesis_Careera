import "dotenv/config";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";
import prisma from "../backend/lib/prisma.js";
import { rebuildListingVectors } from "../backend/services/listingVectorService.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

try {
  const result = await rebuildListingVectors();
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Could not rebuild listing skill vectors.", error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
