import prisma from "../lib/prisma.js";
import { extractSkills } from "./skillMatcher.js";

const skillSelect = {
  skillId: true,
  canonicalSkill: true,
  synonyms: true,
};

export async function rebuildListingVectors({ database = prisma } = {}) {
  return database.$transaction(async (transaction) => {
    const [skills, listings] = await Promise.all([
      transaction.skillDictionary.findMany({
        select: skillSelect,
        orderBy: { skillId: "asc" },
      }),
      transaction.jobListing.findMany({
        select: {
          listingId: true,
          title: true,
          description: true,
        },
        orderBy: { listingId: "asc" },
      }),
    ]);

    const listingMatches = listings.map((listing) => {
      const text = `${listing.title} ${listing.description ?? ""}`;
      return {
        listingId: listing.listingId,
        textLength: text.length,
        matches: extractSkills(text, skills),
      };
    });
    const documentFrequencies = new Map(skills.map((skill) => [skill.skillId, 0]));
    for (const listing of listingMatches) {
      for (const skillId of listing.matches.keys()) {
        documentFrequencies.set(skillId, documentFrequencies.get(skillId) + 1);
      }
    }

    const totalListings = listings.length;
    const computedAt = new Date();
    const idfRows = skills.map((skill) => {
      const docFreq = documentFrequencies.get(skill.skillId);
      // Smoothed IDF: ln((N + 1) / (df + 1)) + 1.
      const idf = Math.log((totalListings + 1) / (docFreq + 1)) + 1;
      return { skillId: skill.skillId, docFreq, idf, computedAt };
    });
    const idfBySkill = new Map(idfRows.map((row) => [row.skillId, row.idf]));
    const skillById = new Map(skills.map((skill) => [skill.skillId, skill]));
    const listingSkillRows = [];
    for (const listing of listingMatches) {
      for (const [skillId, termCount] of listing.matches) {
        // Log-scaled term frequency: 1 + ln(count), for count > 0.
        const tf = 1 + Math.log(termCount);
        const idf = idfBySkill.get(skillId);
        listingSkillRows.push({
          listingId: listing.listingId,
          skillId,
          termCount,
          tfidf: tf * idf,
        });
      }
    }

    await transaction.listingSkill.deleteMany();
    await transaction.skillIdf.deleteMany();
    if (listingSkillRows.length > 0) {
      await transaction.listingSkill.createMany({ data: listingSkillRows });
    }
    if (idfRows.length > 0) {
      await transaction.skillIdf.createMany({ data: idfRows });
    }

    const topFrequentSkills = idfRows
      .filter((row) => row.docFreq > 0)
      .sort((left, right) => (
        right.docFreq - left.docFreq
        || left.skillId.localeCompare(right.skillId)
      ))
      .slice(0, 10)
      .map((row) => ({
        skillId: row.skillId,
        skill: skillById.get(row.skillId).canonicalSkill,
        docFreq: row.docFreq,
      }));
    const textLengths = listingMatches.map((listing) => listing.textLength);

    return {
      listingCount: totalListings,
      zeroMatchedListingCount: listingMatches.filter(
        (listing) => listing.matches.size === 0,
      ).length,
      averageTextLength: textLengths.length
        ? textLengths.reduce((total, length) => total + length, 0) / textLengths.length
        : null,
      minimumTextLength: textLengths.length ? Math.min(...textLengths) : null,
      topFrequentSkills,
      skillsWithoutListings: idfRows
        .filter((row) => row.docFreq === 0)
        .map((row) => ({
          skillId: row.skillId,
          skill: skillById.get(row.skillId).canonicalSkill,
        })),
      listingSkillCount: listingSkillRows.length,
      skillIdfCount: idfRows.length,
    };
  });
}
