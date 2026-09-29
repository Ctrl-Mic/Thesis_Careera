import { Router } from "express";
import users from "../data/users.js";

const router = Router();

router.post("/login", (request, response) => {
  const { email, password } = request.body ?? {};
  const normalizedEmail = String(email ?? "").trim().toLowerCase();

  const user = users.find(
    (candidate) =>
      candidate.email.toLowerCase() === normalizedEmail &&
      candidate.password === password
  );

  if (!user) {
    return response.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  return response.json({ success: true });
});

export default router;