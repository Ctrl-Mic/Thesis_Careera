import "dotenv/config";
import express from "express";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";
import swaggerUi from "swagger-ui-express";
import authRouter from "./routes/auth.js";
import profileRouter from "./routes/profile.js";
import adminRouter from "./routes/admin.js";
import verificationRouter from "./routes/verification.js";
import assessmentRouter from "./routes/assessment.js";
import recommendationsRouter from "./routes/recommendations.js";
import jobListingsRouter from "./routes/jobListings.js";
import openApiSpec from "./openapi.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use((request, response, next) => {
  const startedAt = process.hrtime.bigint();
  const requestPath = request.originalUrl.split("?")[0];
  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    console.info(`[API] ${request.method} ${requestPath} \u2192 ${response.statusCode} (${durationMs.toFixed(1)}ms)`);
  });
  next();
});
app.use(express.json({ limit: "7mb" }));

app.get("/openapi.json", (_request, response) => response.json(openApiSpec));
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use("/api", authRouter);
app.use("/api", profileRouter);
app.use("/api", adminRouter);
app.use("/api", verificationRouter);
app.use("/api", assessmentRouter);
app.use("/api", recommendationsRouter);
app.use("/api", jobListingsRouter);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.use((error, _request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  const statusCode = error?.status === 413 ? 413 : error?.status === 400 ? 400 : 500;
  const message = statusCode === 413
    ? "Request body is too large."
    : statusCode === 400
      ? "Request body is invalid."
      : "An unexpected server error occurred.";
  console.error(`[API] Request failed with status ${statusCode}.`);
  response.status(statusCode).json({ success: false, message });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Authentication server listening on http://127.0.0.1:${port}`);
});