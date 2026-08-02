import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { writeFile, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  capture,
  captureAiGeneration,
  shutdown,
  resetPostHogClient,
  setPostHogClientForTests,
  resolveApiKey,
} from "../src/posthog.js";

describe("load-env", async () => {
  const { loadEnvFiles } = await import("../src/load-env.js");

  it("does not override existing process.env values", async () => {
    const dir = await mkdir(path.join(os.tmpdir(), `pr-ex-env-${Date.now()}`), {
      recursive: true,
    });
    const prev = process.cwd();
    const prevKeep = process.env.LOAD_ENV_TEST_KEY;
    try {
      process.chdir(dir);
      await writeFile(
        path.join(dir, ".env"),
        "LOAD_ENV_TEST_KEY=from_file\n",
        "utf8"
      );
      process.env.LOAD_ENV_TEST_KEY = "already_set";
      loadEnvFiles();
      assert.equal(process.env.LOAD_ENV_TEST_KEY, "already_set");
    } finally {
      process.chdir(prev);
      if (prevKeep === undefined) delete process.env.LOAD_ENV_TEST_KEY;
      else process.env.LOAD_ENV_TEST_KEY = prevKeep;
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe("posthog capture + shutdown", () => {
  let captures;
  let shutdownCalls;
  let fake;

  beforeEach(() => {
    captures = [];
    shutdownCalls = 0;
    fake = {
      capture(payload) {
        captures.push(payload);
      },
      async shutdown() {
        shutdownCalls += 1;
      },
    };
    resetPostHogClient();
  });

  afterEach(() => {
    resetPostHogClient();
  });

  it("no-ops capture and shutdown when no client configured", async () => {
    setPostHogClientForTests(null);
    // Force "configured as absent" — getPostHog returns null
    assert.equal(capture("x", "id", {}), false);
    await shutdown();
    assert.equal(captures.length, 0);
    assert.equal(shutdownCalls, 0);
  });

  it("captures product events and $ai_generation via injected client", async () => {
    setPostHogClientForTests(fake);

    assert.equal(capture("profile_initialized", "dev-1", { force: false }), true);
    assert.equal(capture("explainer_generation_started", "dev-1", { mode: "repo" }), true);
    assert.equal(
      captureAiGeneration("dev-1", {
        prompt: "hello prompt",
        output: "# title\n\n## What it does\n- x",
        latencySec: 1.25,
        mode: "repo",
        properties: { repo_name: "acme/app" },
      }),
      true
    );
    assert.equal(capture("explainer_generated", "dev-1", { mode: "repo" }), true);

    assert.equal(captures.length, 4);
    assert.equal(captures[0].event, "profile_initialized");
    assert.equal(captures[1].event, "explainer_generation_started");
    assert.equal(captures[2].event, "$ai_generation");
    assert.equal(captures[2].properties.explainer_mode, "repo");
    assert.equal(captures[2].properties.prompt_name, "repo_explainer");
    assert.equal(captures[2].properties.$ai_latency, 1.25);
    assert.ok(Array.isArray(captures[2].properties.$ai_input));
    assert.ok(Array.isArray(captures[2].properties.$ai_output_choices));
    assert.equal(captures[3].event, "explainer_generated");

    await shutdown();
    assert.equal(shutdownCalls, 1);
  });

  it("resolveApiKey prefers POSTHOG_API_KEY then POSTHOG_PROJECT_TOKEN", () => {
    const prevKey = process.env.POSTHOG_API_KEY;
    const prevTok = process.env.POSTHOG_PROJECT_TOKEN;
    try {
      delete process.env.POSTHOG_API_KEY;
      process.env.POSTHOG_PROJECT_TOKEN = "phc_alias";
      assert.equal(resolveApiKey(), "phc_alias");
      process.env.POSTHOG_API_KEY = "phc_primary";
      assert.equal(resolveApiKey(), "phc_primary");
    } finally {
      if (prevKey === undefined) delete process.env.POSTHOG_API_KEY;
      else process.env.POSTHOG_API_KEY = prevKey;
      if (prevTok === undefined) delete process.env.POSTHOG_PROJECT_TOKEN;
      else process.env.POSTHOG_PROJECT_TOKEN = prevTok;
    }
  });
});

describe("cli event name contract (static)", async () => {
  const { readFile } = await import("node:fs/promises");
  const cliSrc = await readFile(
    new URL("../src/cli.js", import.meta.url),
    "utf8"
  );

  it("emits the funnel events the product expects", () => {
    assert.match(cliSrc, /capture\("profile_initialized"/);
    assert.match(cliSrc, /capture\("explainer_generation_started"/);
    assert.match(cliSrc, /capture\("explainer_generated"/);
    assert.match(cliSrc, /captureAiGeneration\(/);
    assert.match(cliSrc, /await shutdown\(\)/);
  });
});
