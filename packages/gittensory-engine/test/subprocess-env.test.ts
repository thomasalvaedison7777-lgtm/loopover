import { test } from "node:test";
import assert from "node:assert/strict";

import { SUBPROCESS_CLI_ENV_ALLOWLIST, buildAllowlistedEnv, SECRET_PATTERNS, redactSecrets } from "../dist/index.js";

test("buildAllowlistedEnv: copies only allowlisted keys; a caller-supplied allowlist is honored; extra overlays", () => {
  const parent = { HOME: "/home/node", SECRET_TOKEN: "sk-should-not-copy", PATH: "/usr/bin", CUSTOM: "keep" };
  // the standard allowlist copies HOME + PATH, drops SECRET_TOKEN + CUSTOM
  assert.deepEqual(buildAllowlistedEnv(parent, SUBPROCESS_CLI_ENV_ALLOWLIST), { HOME: "/home/node", PATH: "/usr/bin" });
  // a DIFFERENT caller-supplied allowlist is honored (CUSTOM now allowed), and `extra` overlays a parent value
  assert.deepEqual(buildAllowlistedEnv(parent, ["HOME", "CUSTOM"], { EXTRA: "v", HOME: "/override" }), {
    HOME: "/override",
    CUSTOM: "keep",
    EXTRA: "v",
  });
  // undefined values are dropped from both the parent and `extra`
  assert.deepEqual(buildAllowlistedEnv({ A: undefined }, ["A"], { B: undefined }), {});
});

test("redactSecrets: strips every SECRET_PATTERNS family, plus caller-supplied known secrets", () => {
  assert.equal(redactSecrets("key sk-abcdefghijklmnop123"), "key [redacted]"); // OpenAI/Anthropic
  assert.equal(redactSecrets("tok ghp_ABCDEFGHIJKLMNOPQRSTUV"), "tok [redacted]"); // GitHub token
  assert.equal(redactSecrets("pat github_pat_ABCDEFGHIJKLMNOPQRST"), "pat [redacted]"); // GitHub fine-grained PAT
  assert.equal(redactSecrets("jwt eyJhbGciOi.eyJzdWIiO.SflKxwRJSM"), "jwt [redacted]"); // JWT
  assert.equal(redactSecrets("aws AKIAIOSFODNN7EXAMPLE"), "aws [redacted]"); // AWS access key id
  // a known secret (length >= 8) is stripped exactly; a short one is NOT (guards unrelated diagnostic text)
  assert.equal(redactSecrets("value=supersecretvalue", ["supersecretvalue"]), "value=[redacted]");
  assert.equal(redactSecrets("t and t again", ["t"]), "t and t again");
});

test("SECRET_PATTERNS carries the full ported regex family", () => {
  assert.equal(SECRET_PATTERNS.length, 5);
});
