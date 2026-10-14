import "dotenv/config";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";
import {
  DEFAULT_JOB_KEYWORDS,
  DEFAULT_JOB_LOCATION,
  DEFAULT_JOB_RESULT_LIMIT,
  JOB_FETCH_DELAY_MS,
} from "../backend/config/jobFetchConfig.js";
import { fetchAndStoreJobs } from "../backend/services/jobFetchService.js";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

function parseArguments(argumentsList) {
  const options = { allDefaults: false };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--all-defaults") {
      options.allDefaults = true;
    } else if (argument === "--keywords" || argument === "--location") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${argument} requires a value.`);
      }
      options[argument === "--keywords" ? "keywords" : "location"] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (options.allDefaults && (options.keywords || options.location)) {
    throw new Error("--all-defaults cannot be combined with --keywords or --location.");
  }
  return options;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function runAllDefaults() {
  const totals = { fetched: 0, inserted: 0, updated: 0 };
  let requestCount = 0;
  for (const keywords of DEFAULT_JOB_KEYWORDS) {
    if (requestCount > 0) await delay(JOB_FETCH_DELAY_MS);
    const result = await fetchAndStoreJobs({
      keywords,
      location: DEFAULT_JOB_LOCATION,
    }, { resultLimit: DEFAULT_JOB_RESULT_LIMIT });
    requestCount += 1;
    totals.fetched += result.fetched;
    totals.inserted += result.inserted;
    totals.updated += result.updated;
  }
  return totals;
}

try {
  const options = parseArguments(process.argv.slice(2));
  const result = options.allDefaults
    ? await runAllDefaults()
    : await fetchAndStoreJobs({
      keywords: options.keywords,
      location: options.location ?? DEFAULT_JOB_LOCATION,
    });
  console.log(JSON.stringify(result));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
