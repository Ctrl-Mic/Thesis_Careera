import prisma from "../lib/prisma.js";

const readinessThreshold = 0.6;
const maxGaps = 10;

export function cosine(a, b) {
  const entriesA = Object.entries(a);
  const entriesB = Object.entries(b);
  const normA = Math.sqrt(entriesA.reduce((sum, [, weight]) => sum + weight ** 2, 0));
  const normB = Math.sqrt(entriesB.reduce((sum, [, weight]) => sum + weight ** 2, 0));
  if (normA === 0 || normB === 0) return 0;

  const vectorB = new Map(entriesB);
  const dotProduct = entriesA.reduce(
    (sum, [skillId, weight]) => sum + weight * (vectorB.get(skillId) ?? 0),
    0,
  );
  return dotProduct / (normA * normB);
}

function makeRecommendation(listing, finalWeights, userVector) {
  const listingVector = Object.fromEntries(
    listing.listingSkills.map(({ skillId, tfidf }) => [skillId, tfidf]),
  );
  const gaps = listing.listingSkills
    .filter(({ skillId }) => (finalWeights.get(skillId) ?? 0) < readinessThreshold)
    .map(({ skillId, tfidf, skill }) => ({
      skill_id: skillId,
      name: skill.canonicalSkill ?? skillId,
      listing_weight: tfidf,
      user_weight: finalWeights.get(skillId) ?? 0,
    }))
    .sort((left, right) => (
      right.listing_weight - left.listing_weight
      || left.skill_id.localeCompare(right.skill_id)
    ))
    .slice(0, maxGaps);
  const metSkills = listing.listingSkills.filter(
    ({ skillId }) => (finalWeights.get(skillId) ?? 0) >= readinessThreshold,
  ).length;
  const readinessPct = listing.listingSkills.length
    ? (metSkills / listing.listingSkills.length) * 100
    : null;
  const matchScore = cosine(userVector, listingVector);

  return {
    listing_id: listing.listingId,
    title: listing.title,
    company: listing.company,
    location: listing.location,
    external_url: listing.externalUrl,
    match_score: matchScore,
    match_percent: Math.round(matchScore * 100),
    readiness_pct: readinessPct,
    gaps,
  };
}

export async function computeRecommendations(
  userId,
  { limit = 20, location, type } = {},
  database = prisma,
) {
  return database.$transaction(async (transaction) => {
    const [attempt, profiles, idfs, listings] = await Promise.all([
      transaction.assessmentAttempt.findFirst({
        where: { userId },
        select: { attemptId: true },
      }),
      transaction.userSkillProfile.findMany({
        where: { userId },
        select: { skillId: true, finalWeight: true },
      }),
      transaction.skillIdf.findMany({
        select: { skillId: true, idf: true },
      }),
      transaction.jobListing.findMany({
        where: {
          isActive: true,
          ...(location ? { location: { contains: location, mode: "insensitive" } } : {}),
          ...(type ? { listingType: type } : {}),
        },
        select: {
          listingId: true,
          title: true,
          company: true,
          location: true,
          externalUrl: true,
          listingSkills: {
            select: {
              skillId: true,
              tfidf: true,
              skill: { select: { canonicalSkill: true } },
            },
          },
        },
      }),
    ]);

    if (!attempt || !profiles.some(({ finalWeight }) => finalWeight > 0)) {
      await transaction.recommendation.deleteMany({ where: { userId } });
      return { code: "NO_PROFILE", results: [] };
    }

    const finalWeights = new Map(
      profiles.map(({ skillId, finalWeight }) => [skillId, finalWeight]),
    );
    const idfBySkill = new Map(idfs.map(({ skillId, idf }) => [skillId, idf]));
    const userVector = Object.fromEntries(
      profiles
        .filter(({ skillId, finalWeight }) => finalWeight !== 0 && idfBySkill.has(skillId))
        .map(({ skillId, finalWeight }) => [skillId, finalWeight * idfBySkill.get(skillId)]),
    );
    const ranked = listings
      .map((listing) => makeRecommendation(listing, finalWeights, userVector))
      .sort((left, right) => (
        right.match_score - left.match_score
        || left.listing_id - right.listing_id
      ));
    const positiveMatches = ranked.filter(({ match_score }) => match_score > 0);
    const results = (positiveMatches.length >= limit
      ? positiveMatches
      : ranked).slice(0, limit);
    const computedAt = new Date();

    await transaction.recommendation.deleteMany({ where: { userId } });
    if (results.length > 0) {
      await transaction.recommendation.createMany({
        data: results.map((result) => ({
          userId,
          listingId: result.listing_id,
          matchScore: result.match_score,
          readinessPct: result.readiness_pct,
          gaps: result.gaps,
          computedAt,
        })),
      });
    }

    return { results };
  });
}
