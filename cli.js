#!/usr/bin/env node

const linkedIn = require("./index");
const { buildQueryOptions, parseArgs } = require("./cli-utils");
const {
  appendReferralMessages,
  DEFAULT_REFERRAL_RECEIVER,
  DEFAULT_REFERRAL_SERVICE_URL,
  writeJobOpeningsFile,
} = require("./job-openings");

function printHelp() {
  process.stdout.write(
    `Usage: linkedin-jobs-api [options]\n\n` +
      `Options:\n` +
      `  -k, --keyword <value>              Search keyword\n` +
      `  -l, --location <value>             Job location\n` +
      `      --date-since-posted <value>    past month | past week | 24hr\n` +
      `      --job-type <value>             full time | part time | contract | temporary | volunteer | internship\n` +
      `      --remote-filter <value>        on site | remote | hybrid\n` +
      `      --salary <value>               40000 | 60000 | 80000 | 100000 | 120000\n` +
      `      --experience-level <value>     internship | entry level | associate | senior | director | executive\n` +
      `  -n, --limit <value>                Max number of jobs to return\n` +
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
      `  linkedin-jobs-api --keyword "software engineer" --location India --limit 10 --pretty\n` +
      `  linkedin-jobs-api --location "United States" --remote-filter remote --job-type "full time"\n`
  );
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const hasQuery = [
      "keyword",
      "location",
      "dateSincePosted",
      "jobType",
      "remoteFilter",
      "salary",
      "experienceLevel",
      "has_verification",
      "under_10_applicants",
    ].some((key) => args[key] !== undefined);

    if (args.help || !hasQuery) {
      printHelp();
      process.exitCode = 0;
      return;
    }

    const response = await linkedIn.query(buildQueryOptions(args));
    const jobs = await appendReferralMessages(response, {
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
