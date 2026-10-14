import { Router } from "express";
import prisma from "../lib/prisma.js";
import { computeRecommendations } from "../services/recommendationService.js";
import { getAuthUserId } from "../services/sessionService.js";

export function createRecommendationsRouter({ database = prisma } = {}) {
  const router = Router();

  router.get("/recommendations", async (request, response) => {
    const authorization = request.get("authorization") ?? "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const userId = getAuthUserId(token);
    if (!userId) {
      return response.status(401).json({
        success: false,
        message: "Sign in to continue.",
      });
    }

    const user = await database.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return response.status(401).json({
        success: false,
        message: "Your account could not be found.",
      });
    }

    const rawLimit = request.query.limit;
    const limit = rawLimit === undefined ? 20 : Number(rawLimit);
    const location = request.query.location;
    const type = request.query.type;
    if (
      (rawLimit !== undefined && typeof rawLimit !== "string")
      || !Number.isInteger(limit)
      || limit < 1
    ) {
      return response.status(400).json({
        success: false,
        message: "limit must be a positive integer.",
      });
    }
    if (location !== undefined && typeof location !== "string") {
      return response.status(400).json({
        success: false,
        message: "location must be a single string.",
      });
    }
    if (
      type !== undefined
      && (typeof type !== "string" || !["job", "practicum"].includes(type))
    ) {
      return response.status(400).json({
        success: false,
        message: "type must be either job or practicum.",
      });
    }

    const result = await computeRecommendations(user.id, {
      limit,
      ...(location?.trim() ? { location: location.trim() } : {}),
      ...(type ? { type } : {}),
    }, database);
    return response.json(result);
  });

  return router;
}

export default createRecommendationsRouter();
