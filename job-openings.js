const fs = require("fs/promises");
const path = require("path");
const axios = require("axios");

const DEFAULT_JOB_OPENINGS_DIR = "job-openings";
const DEFAULT_REFERRAL_RECEIVER = "Hiring Team";
const DEFAULT_REFERRAL_SERVICE_URL = "http://127.0.0.1:8000/generate";

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function resolveOutputDir(outputDir, baseDir = __dirname) {
  const dir = outputDir || DEFAULT_JOB_OPENINGS_DIR;
  return path.isAbsolute(dir) ? dir : path.join(baseDir, dir);
}

function extractJobId(job) {
  const explicitId = job.id || job.jobId;
  if (explicitId) {
    return String(explicitId);
  }

  const jobUrl = job.jobUrl || job.url || "";
  const currentJobIdMatch = jobUrl.match(/[?&]currentJobId=(\d+)/);
  if (currentJobIdMatch) {
    return currentJobIdMatch[1];
  }

  const viewIdMatch = jobUrl.match(/\/jobs\/view\/(?:[^/?#]*-)?(\d+)(?=[/?#]|$)/);
  if (viewIdMatch) {
    return viewIdMatch[1];
  }

  return "N/A";
}

function buildReferralPayload(job, receiver = DEFAULT_REFERRAL_RECEIVER) {
  return {
    receiver,
    target_company: job.company || job.organization || "N/A",
    target_role: job.position || job.title || "N/A",
    id: extractJobId(job),
    job_link: job.jobUrl || job.url || "N/A",
  };
}

function referralUrlWithRawText(serviceUrl = DEFAULT_REFERRAL_SERVICE_URL) {
  const url = new URL(serviceUrl);
  if (!url.searchParams.has("raw")) {
    url.searchParams.set("raw", "true");
  }
  return url.toString();
}

async function generateReferralMessage(job, options = {}) {
  const payload = buildReferralPayload(
    job,
    options.receiver || DEFAULT_REFERRAL_RECEIVER
  );
  const serviceUrl = referralUrlWithRawText(
    options.serviceUrl || DEFAULT_REFERRAL_SERVICE_URL
  );
  let response;

  try {
    response = await axios.post(serviceUrl, payload, {
      headers: { "Content-Type": "application/json" },
      responseType: "text",
      timeout: options.timeout || 10000,
      transformResponse: [(data) => data],
    });
  } catch (error) {
    throw new Error(
      `Referral service request failed for ${payload.target_company} - ${payload.target_role}: ${
        error.message || String(error)
      }. Ensure referral_service is running and reachable at ${serviceUrl}.`
    );
  }

  return {
    payload,
    message:
      typeof response.data === "string"
        ? response.data
        : response.data.message,
  };
}

async function appendReferralMessages(jobs, options = {}) {
  const enrichedJobs = [];

  for (const job of jobs) {
    const { payload, message } = await generateReferralMessage(job, options);
    enrichedJobs.push({
      ...job,
      jobId: payload.id,
      referralMessage: message,
    });
  }

  return enrichedJobs;
}

async function writeJobOpeningsFile(jobs, options = {}) {
  const outputDir = resolveOutputDir(options.outputDir, options.baseDir);
  await fs.mkdir(outputDir, { recursive: true });

  const filename = `job-openings-${timestampForFilename(options.date)}.json`;
  const filePath = path.join(outputDir, filename);
  const spacing = options.pretty === false ? 0 : 2;
  await fs.writeFile(filePath, `${JSON.stringify(jobs, null, spacing)}\n`, "utf8");
  return filePath;
}

module.exports = {
  DEFAULT_JOB_OPENINGS_DIR,
  DEFAULT_REFERRAL_RECEIVER,
  DEFAULT_REFERRAL_SERVICE_URL,
  appendReferralMessages,
  buildReferralPayload,
  extractJobId,
  generateReferralMessage,
  writeJobOpeningsFile,
};
