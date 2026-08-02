import { randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";

const token = process.env.POSTHOG_PROJECT_TOKEN;
const host = process.env.POSTHOG_HOST;
const isProduction = process.env.NODE_ENV === "production";
const distinctId = randomUUID();

function missingConfiguration(variable) {
  if (!isProduction) {
    console.error(
      `${variable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This message stops appearing once ${variable} is configured`
    );
  }
}

if (!token) missingConfiguration("POSTHOG_PROJECT_TOKEN");
if (!host) missingConfiguration("POSTHOG_HOST");

export const posthog = token && host ? new PostHog(token, { host }) : null;

export function capture(event, properties) {
  posthog?.capture({
    distinctId,
    event,
    properties: {
      $process_person_profile: false,
      ...properties,
    },
  });
}

export async function shutdownPostHog() {
  await posthog?.shutdown();
}
