#!/usr/bin/env node

const linkedIn = require("./index");
const targetCompanies = require("./companies");
const {
  buildQueryOptions,
  matchesTargetCompany,
  parseArgs,
} = require("./cli-utils");
const {
  appendReferralMessages,
  DEFAULT_REFERRAL_RECEIVER,
  DEFAULT_REFERRAL_SERVICE_URL,
  writeJobOpeningsFile,
} = require("./job-openings");

function printHelp() {
  process.stdout.write(
    `Usage: linkedin-jobs-companies [options]\n\n` +
      `This command searches LinkedIn jobs and keeps only results from the\n` +
      `predefined company list bundled with this package.\n\n` +
      `Options:\n` +
      `  -k, --keyword <value>              Search keyword\n` +
      `  -l, --location <value>             Job location\n` +
      `      --date-since-posted <value>    past month | past week | 24hr\n` +
      `      --job-type <value>             full time | part time | contract | temporary | volunteer | internship\n` +
      `      --remote-filter <value>        on site | remote | hybrid\n` +
      `      --salary <value>               40000 | 60000 | 80000 | 100000 | 120000\n` +
      `      --experience-level <value>     internship | entry level | associate | senior | director | executive\n` +
      `  -n, --limit <value>                Max number of filtered jobs to return\n` +
      `  -p, --page <value>                 Result page number\n` +
      `  -s, --sort-by <value>             recent | relevant\n` +
      `      --host <value>                LinkedIn host, defaults to www.linkedin.com\n` +
      `      --job-openings-dir <value>    Directory for timestamped job-opening JSON files\n` +
      `      --referral-receiver <value>   Referral message greeting, defaults to "${DEFAULT_REFERRAL_RECEIVER}"\n` +
      `      --referral-service-url <url>  Referral API URL, defaults to ${DEFAULT_REFERRAL_SERVICE_URL}\n` +
      `      --has-verification            Only verified jobs\n` +
      `      --under-10-applicants         Only jobs with under 10 applicants\n` +
      `      --pretty                      Pretty-print saved JSON file\n` +
      `  -h, --help                        Show this help\n\n` +
      `Examples:\n` +
      `  linkedin-jobs-companies --keyword "software engineer" --location India --limit 10 --pretty\n` +
      `  linkedin-jobs-companies --keyword "data scientist" --sort-by recent\n`
  );
}

function normalizeLimit(limit) {
  const requested = Number(limit) || 0;
  if (!requested) {
    return 0;
  }

  return Math.max(requested * 10, 50);
}

function filterTargetCompanies(jobs) {
  return jobs.filter((job) => matchesTargetCompany(job.company, targetCompanies));
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));

    if (args.help) {
      printHelp();
      process.exitCode = 0;
      return;
    }

    const queryOptions = buildQueryOptions(args);
    const requestedLimit = Number(args.limit) || 0;
    const fetchLimit = normalizeLimit(args.limit);

    if (fetchLimit) {
      queryOptions.limit = String(fetchLimit);
    } else {
      delete queryOptions.limit;
    }

    const response = await linkedIn.query(queryOptions);
    const filtered = filterTargetCompanies(response);
    const matchingJobs = requestedLimit ? filtered.slice(0, requestedLimit) : filtered;
    const jobs = await appendReferralMessages(matchingJobs, {
      receiver: args.referralReceiver,
      serviceUrl: args.referralServiceUrl,
    });
    const filePath = await writeJobOpeningsFile(jobs, {
      outputDir: args.jobOpeningsDir,
      baseDir: __dirname,
      pretty: Boolean(args.pretty),
    });

    process.stdout.write(`Saved ${jobs.length} job openings to ${filePath}\n`);
  } catch (error) {
    process.stderr.write(`${error.message || String(error)}\n`);
    process.exitCode = 1;
  }
}

main();
