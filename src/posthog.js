/**
 * PostHog analytics client for pr-explainer.
 *
 * Uses a persistent anonymous device ID stored in ~/.pr-explainer/device-id
 * so returning users are tracked across sessions without collecting any PII.
 * All captures are guarded behind POSTHOG_API_KEY or POSTHOG_PROJECT_TOKEN.
 */
import { PostHog } from "posthog-node";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import os from "node:os";
import { loadEnvFiles } from "./load-env.js";

loadEnvFiles();

const CONFIG_DIR = path.join(os.homedir(), ".pr-explainer");
const DEVICE_ID_FILE = path.join(CONFIG_DIR, "device-id");
const AI_TEXT_BUDGET = 80_000;

let _client = null;
let _deviceId = null;
let _clientReady = false;

function resolveApiKey() {
  return (
    process.env.POSTHOG_API_KEY ||
    process.env.POSTHOG_PROJECT_TOKEN ||
    ""
  ).trim();
}

function createClient() {
  const apiKey = resolveApiKey();
  const host = (process.env.POSTHOG_HOST || "").trim() || undefined;

  if (!apiKey) {
    if (process.env.POSTHOG_DEBUG === "1") {
      console.error(
        "POSTHOG_API_KEY / POSTHOG_PROJECT_TOKEN is unset — analytics and AI evals will be skipped.\n" +
          "Set POSTHOG_API_KEY (or POSTHOG_PROJECT_TOKEN) and optional POSTHOG_HOST to enable."
      );
    }
    return null;
  }

  return new PostHog(apiKey, {
    host,
    flushAt: 1,
    flushInterval: 0,
    enableExceptionAutocapture: true,
  });
}

/** Lazily initialise (and memoize) the PostHog client. */
export function getPostHog() {
  if (!_clientReady) {
    _client = createClient();
    _clientReady = true;
  }
  return _client;
}

/** Test helper: drop memoized client so env changes take effect. */
export function resetPostHogClient() {
  _client = null;
  _clientReady = false;
}

/** Test helper: inject a fake client (skips env-based createClient). */
export function setPostHogClientForTests(client) {
  _client = client;
  _clientReady = true;
}

/**
 * Return a stable anonymous device ID, creating and persisting one on first use.
 * This is the distinct ID used for all events — no PII is collected.
 */
export async function getDeviceId() {
  if (_deviceId) return _deviceId;

  if (existsSync(DEVICE_ID_FILE)) {
    try {
      _deviceId = (await readFile(DEVICE_ID_FILE, "utf8")).trim();
      if (_deviceId) return _deviceId;
    } catch {
      // fall through to generate a new one
    }
  }

  _deviceId = randomUUID();
  try {
    await mkdir(CONFIG_DIR, { recursive: true });
    await writeFile(DEVICE_ID_FILE, _deviceId, "utf8");
  } catch {
    // If we can't persist it, the in-memory ID is still fine for this session.
  }
  return _deviceId;
}

/**
 * Capture an event. A no-op when PostHog is not configured.
 * @param {string} event
 * @param {string} distinctId
 * @param {Record<string, unknown>} [properties]
 */
export function capture(event, distinctId, properties = {}) {
  const client = getPostHog();
  if (!client) return false;
  client.capture({ distinctId, event, properties });
  return true;
}

/**
 * Capture an LLM generation for PostHog AI Observability / AI Evals.
 * @param {string} distinctId
 * @param {{
 *   prompt: string,
 *   output: string,
 *   latencySec: number,
 *   mode: "pr" | "repo",
 *   model?: string,
 *   properties?: Record<string, unknown>,
 *   error?: string,
 * }} opts
 */
export function captureAiGeneration(distinctId, opts) {
  const client = getPostHog();
  if (!client) return false;

  const {
    prompt,
    output,
    latencySec,
    mode,
    model = "claude-code",
    properties = {},
    error,
  } = opts;

  const input = truncateForAi(prompt, AI_TEXT_BUDGET);
  const out = truncateForAi(output, AI_TEXT_BUDGET);

  client.capture({
    distinctId,
    event: "$ai_generation",
    properties: {
      $ai_trace_id: randomUUID(),
      $ai_span_name: mode === "repo" ? "repo_explainer" : "pr_explainer",
      $ai_model: model,
      $ai_provider: "anthropic",
      $ai_input: [{ role: "user", content: input }],
      $ai_output_choices: [{ role: "assistant", content: out }],
      $ai_latency: latencySec,
      $ai_is_error: Boolean(error),
      ...(error ? { $ai_error: String(error).slice(0, 2000) } : {}),
      explainer_mode: mode,
      prompt_name: mode === "repo" ? "repo_explainer" : "pr_explainer",
      ...properties,
    },
  });
  return true;
}

function truncateForAi(text, max) {
  const s = String(text || "");
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n…(truncated at ${max} chars for PostHog)`;
}

/**
 * Flush all queued events and shut down the client.
 * Call once before the process exits.
 */
export async function shutdown() {
  const client = getPostHog();
  if (!client) return;
  await client.shutdown();
  resetPostHogClient();
}

export { resolveApiKey, truncateForAi, AI_TEXT_BUDGET };
