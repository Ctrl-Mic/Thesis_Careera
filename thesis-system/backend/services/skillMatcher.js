import natural from "natural";

const stem = (token) => natural.PorterStemmer.stem(token);

function normalizeTokens(text) {
  return text
    .replace(/[-/\\]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(stem);
}

function getTerms(skill) {
  const canonical = skill.canonicalSkill ?? skill.canonical_skill ?? "";
  const synonyms = skill.synonyms ?? "";
  return [canonical, ...synonyms.split(/[;,]/)]
    .map((term) => term.trim())
    .filter(Boolean);
}

function countSequence(tokens, termTokens) {
  let count = 0;
  for (let start = 0; start <= tokens.length - termTokens.length; start += 1) {
    if (termTokens.every((token, offset) => tokens[start + offset] === token)) {
      count += 1;
    }
  }
  return count;
}

function countAcronym(text, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const boundary = String.raw`(^|[^\p{L}\p{N}_])${escaped}(?=$|[^\p{L}\p{N}_])`;
  return [...text.matchAll(new RegExp(boundary, "gu"))].length;
}

export function findSkillMatches(text, skills) {
  const matches = new Map();
  if (typeof text !== "string" || text.length === 0) return matches;

  const normalizedText = normalizeTokens(text);
  for (const skill of skills) {
    let matchCount = 0;
    const matchedTerms = [];
    const seenTerms = new Set();

    for (const term of getTerms(skill)) {
      const isAcronym = /^[A-Z]{1,4}$/.test(term);
      const termTokens = isAcronym ? [] : normalizeTokens(term);
      if (!isAcronym && termTokens.length === 0) continue;
      const identity = isAcronym
        ? `acronym:${term}`
        : `term:${termTokens.join(" ")}`;
      if (seenTerms.has(identity)) continue;
      seenTerms.add(identity);

      const count = isAcronym
        ? countAcronym(text, term)
        : countSequence(normalizedText, termTokens);
      if (count > 0) {
        matchCount += count;
        matchedTerms.push({ term, count });
      }
    }

    if (matchCount > 0) {
      matches.set(skill.skillId ?? skill.skill_id, { matchCount, matchedTerms });
    }
  }

  return matches;
}

export function extractSkills(text, skills) {
  return new Map(
    [...findSkillMatches(text, skills)].map(([skillId, match]) => [
      skillId,
      match.matchCount,
    ]),
  );
}
