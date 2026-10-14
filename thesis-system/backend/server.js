import "dotenv/config";
import express from "express";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import adminRouter from "./routes/admin.js";
import verificationRouter from "./routes/verification.js";
import assessmentRouter from "./routes/assessment.js";
import recommendationsRouter from "./routes/recommendations.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();
const port = 3001;

app.use(express.json({ limit: "7mb" }));
app.use("/api", authRouter);
app.use("/api", profileRouter);
app.use("/api", adminRouter);
app.use("/api", verificationRouter);
app.use("/api", assessmentRouter);
app.use("/api", recommendationsRouter);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Authentication server listening on http://127.0.0.1:${port}`);
});