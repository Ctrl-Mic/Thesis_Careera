import "dotenv/config";
import express from "express";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import authRouter from "./routes/auth.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const app = express();
const port = 3001;

app.use(express.json());
app.use("/api", authRouter);

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Authentication server listening on http://127.0.0.1:${port}`);
});