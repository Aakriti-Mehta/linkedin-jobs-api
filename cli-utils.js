const VALUE_FLAGS = new Set([
  "keyword",
  "location",
  "dateSincePosted",
  "jobType",
  "remoteFilter",
  "salary",
  "experienceLevel",
  "limit",
  "page",
  "sortBy",
  "host",
  "jobOpeningsDir",
  "referralReceiver",
  "referralServiceUrl",
]);

const FLAG_ALIASES = {
  "date-since-posted": "dateSincePosted",
  "experience-level": "experienceLevel",
  "job-type": "jobType",
  "remote-filter": "remoteFilter",
  "sort-by": "sortBy",
  "job-openings-dir": "jobOpeningsDir",
  "referral-receiver": "referralReceiver",
  "referral-service-url": "referralServiceUrl",
  "has-verification": "has_verification",
  "under-10-applicants": "under_10_applicants",
};

const SHORT_FLAG_MAP = {
  h: "help",
  k: "keyword",
  l: "location",
  n: "limit",
  p: "page",
  s: "sortBy",
};

function normalizeFlagName(name) {
  return FLAG_ALIASES[name] || name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function coerceBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return true;
}

function parseArgs(argv) {
  const result = { _: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--") {
      result._.push(...argv.slice(i + 1));
      break;
    }

    if (!arg.startsWith("-")) {
      result._.push(arg);
      continue;
    }

    if (arg.startsWith("--no-")) {
      const key = normalizeFlagName(arg.slice(5));
      result[key] = false;
      continue;
    }

    if (arg.startsWith("--")) {
      const eqIndex = arg.indexOf("=");
      const rawKey = eqIndex === -1 ? arg.slice(2) : arg.slice(2, eqIndex);
      const key = normalizeFlagName(rawKey);
      const inlineValue = eqIndex === -1 ? undefined : arg.slice(eqIndex + 1);
      const expectsValue = VALUE_FLAGS.has(key);

      if (inlineValue !== undefined) {
        result[key] = expectsValue ? inlineValue : coerceBoolean(inlineValue);
        continue;
      }

      if (expectsValue) {
        const nextValue = argv[i + 1];
        if (!nextValue || nextValue.startsWith("-")) {
          throw new Error(`Missing value for --${rawKey}`);
        }
        result[key] = nextValue;
        i += 1;
        continue;
      }

      result[key] = true;
      continue;
    }

    const shortFlags = arg.slice(1).split("");
    for (let j = 0; j < shortFlags.length; j += 1) {
      const shortFlag = shortFlags[j];
      const mappedFlag = SHORT_FLAG_MAP[shortFlag];

      if (!mappedFlag) {
        throw new Error(`Unknown flag: -${shortFlag}`);
      }

      if (mappedFlag === "help") {
        result.help = true;
        continue;
      }

      const nextValue = shortFlags.length > 1 ? arg.slice(j + 2) : argv[i + 1];
      if (!nextValue || nextValue.startsWith("-")) {
        throw new Error(`Missing value for -${shortFlag}`);
      }

      result[mappedFlag] = nextValue;

      if (shortFlags.length > 1) {
        break;
      }

      i += 1;
    }
  }

  return result;
}

function buildQueryOptions(args) {
  return {
    host: args.host,
    keyword: args.keyword,
    location: args.location,
    dateSincePosted: args.dateSincePosted,
    jobType: args.jobType,
    remoteFilter: args.remoteFilter,
    salary: args.salary,
    experienceLevel: args.experienceLevel,
    limit: args.limit,
    page: args.page,
    sortBy: args.sortBy,
    has_verification: Boolean(args.has_verification),
    under_10_applicants: Boolean(args.under_10_applicants),
  };
}

function normalizeCompanyName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesTargetCompany(companyName, targetCompanies) {
  const normalizedCompany = normalizeCompanyName(companyName);
  if (!normalizedCompany) {
    return false;
  }

  return targetCompanies.some((target) => {
    const normalizedTarget = normalizeCompanyName(target);
    return (
      normalizedCompany.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedCompany)
    );
  });
}

module.exports = {
  buildQueryOptions,
  matchesTargetCompany,
  normalizeCompanyName,
  parseArgs,
};
