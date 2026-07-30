#!/usr/bin/env node

const { execFile } = require("child_process");
const fs = require("fs/promises");
const path = require("path");
const nodemailer = require("nodemailer");

const repoRoot = __dirname;
const companiesScript = path.join(repoRoot, "scripts", "companies.sh");

const SEARCH_ARGS = [
  "--keyword",
  "software engineer 2 II Python Backend",
  "--location",
  "India",
  "--limit",
  "15",
  "--date-since-posted",
  "24hr",
  "--sort-by",
  "relevant",
  "--pretty",
];

function execCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { ...options, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function extractSavedFilePath(stdout) {
  const match = stdout.match(/Saved \d+ job openings to (.+)\s*$/m);
  if (!match) {
    throw new Error(`Could not find saved job-openings file path in CLI output: ${stdout}`);
  }
  return match[1].trim();
}

function getTransporter() {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }

  const host = requireEnv("SMTP_HOST");
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "").toLowerCase() === "true" || port === 465;
  const user = requireEnv("SMTP_USER");
  const pass = requireEnv("SMTP_PASS");

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

function formatEmailBody(jobs) {
  const lines = [];
  lines.push("Daily LinkedIn company jobs report");
  lines.push("");
  lines.push(`Search: ${SEARCH_ARGS.join(" ")}`);
  lines.push(`Total matches: ${jobs.length}`);
  lines.push("");

  if (!jobs.length) {
    lines.push("No matching jobs were found for the allowed company list.");
    return lines.join("\n");
  }

  jobs.forEach((job, index) => {
    lines.push(`${index + 1}. ${job.position}`);
    lines.push(`   Company: ${job.company}`);
    lines.push(`   Location: ${job.location || "N/A"}`);
    lines.push(`   Date: ${job.date || "N/A"}`);
    lines.push(`   Link: ${job.jobUrl || "N/A"}`);
    if (job.referralMessage) {
      lines.push("   Referral message:");
      lines.push(
        job.referralMessage
          .split("\n")
          .map((line) => `   ${line}`)
          .join("\n")
      );
    }
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

async function main() {
  try {
    const { stdout } = await execCommand("sh", [companiesScript, ...SEARCH_ARGS], {
      cwd: repoRoot,
      env: process.env,
    });

    const savedFilePath = extractSavedFilePath(stdout);
    const jobs = JSON.parse(await fs.readFile(savedFilePath, "utf8"));
    const subject = process.env.EMAIL_SUBJECT || "Daily LinkedIn company jobs report";
    const text = formatEmailBody(jobs);

    if (String(process.env.DRY_RUN || "").toLowerCase() === "true") {
      process.stdout.write(`${text}\n`);
      return;
    }

    const to = requireEnv("EMAIL_TO");
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!from) {
      throw new Error("Missing required environment variable: SMTP_FROM or SMTP_USER");
    }

    const transporter = getTransporter();

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
    });

    process.stdout.write(`Email sent to ${to}\n`);
  } catch (error) {
    const message = error.stderr || error.stdout || error.message || String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

main();
