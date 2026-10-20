import { Router } from "express";
import prisma from "../lib/prisma.js";

export function createJobListingsRouter({ database = prisma } = {}) {
  const router = Router();

  router.get("/job-listings", async (request, response) => {
    const rawLimit = request.query.limit;
    const limit = rawLimit === undefined ? 50 : Number(rawLimit);
    const type = request.query.type;
    const location = request.query.location;

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

    if (type !== undefined && (typeof type !== "string" || !["job", "practicum"].includes(type))) {
      return response.status(400).json({
        success: false,
        message: "type must be either job or practicum.",
      });
    }

    if (location !== undefined && typeof location !== "string") {
      return response.status(400).json({
        success: false,
        message: "location must be a single string.",
      });
    }

    const rows = await database.jobListing.findMany({
      where: {
        isActive: true,
        ...(type ? { listingType: type } : {}),
        ...(location && location.trim()
          ? { location: { contains: location.trim(), mode: "insensitive" } }
          : {}),
      },
      orderBy: [{ fetchedAt: "desc" }, { listingId: "desc" }],
      take: limit,
      select: {
        listingId: true,
        source: true,
        title: true,
        company: true,
        location: true,
        description: true,
        jobType: true,
        salary: true,
        listingType: true,
        externalUrl: true,
        listingSkills: {
          select: {
            skill: { select: { canonicalSkill: true } },
          },
        },
      },
    });

    const jobs = rows.map((row) => ({
      id: row.listingId,
      title: row.title,
      company: row.company || "Unknown company",
      location: row.location || "Remote",
      employmentType: row.jobType || "Not specified",
      workType: "Remote",
      skills: (row.listingSkills ?? [])
        .map(({ skill }) => skill?.canonicalSkill)
        .filter(Boolean),
      summary: row.description || "No summary available.",
      url: row.externalUrl || "#",
      logo: "",
      listingType: row.listingType || "job",
      source: row.source || "unknown",
    }));

    return response.json({ success: true, jobs });
  });

  return router;
}

export default createJobListingsRouter();
