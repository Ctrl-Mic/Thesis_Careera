import express from "express";
import authRouter from "./routes/auth.js";

const app = express();
const port = 3001;

app.use(express.json());
app.use("/api", authRouter);

app.listen(port, "127.0.0.1", () => {
  console.log(`Authentication server listening on http://127.0.0.1:${port}`);
});