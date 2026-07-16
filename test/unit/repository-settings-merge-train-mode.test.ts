import { describe, expect, it } from "vitest";
import { getRepositorySettings, upsertRepositorySettings } from "../../src/db/repositories";
import { resolveRepositorySettings } from "../../src/settings/repository-settings";
import { upsertRepoFocusManifest } from "../../src/signals/focus-manifest-loader";
import { createTestEnv } from "../helpers/d1";

// #selfhost-merge-train: mergeTrainMode ("off" | "audit" | "enforce") moved off the DB entirely (Batch B,
// config-as-code migration, loopover#6443) -- it's config-as-code only via .loopover.yml's settings: block
// now. getRepositorySettings always resolves the conservative "off" default regardless of any DB write
// (upsertRepositorySettings silently ignores a caller-supplied mergeTrainMode, and there is no longer a
// column for a direct SQL write to land in); resolveRepositorySettings is the only path that honors an
// explicit per-repo override, via the manifest overlay.
describe("repository_settings: mergeTrainMode config-as-code (#selfhost-merge-train)", () => {
  it("getRepositorySettings returns off for a repo with no DB row at all (conservative default)", async () => {
    const env = createTestEnv();
    const settings = await getRepositorySettings(env, "acme/brand-new-repo");
    expect(settings.mergeTrainMode).toBe("off");
  });

  it("getRepositorySettings ignores a caller-supplied mergeTrainMode on upsert -- always off (no DB column to persist it in)", async () => {
    const env = createTestEnv();
    await upsertRepositorySettings(env, { repoFullName: "acme/fresh-insert", mergeTrainMode: "enforce" });
    const settings = await getRepositorySettings(env, "acme/fresh-insert");
    expect(settings.mergeTrainMode).toBe("off");
  });

  it("resolveRepositorySettings honors an explicit mergeTrainMode from .loopover.yml's settings: block", async () => {
    const env = createTestEnv();
    await upsertRepositorySettings(env, { repoFullName: "acme/manifest-driven" });
    await upsertRepoFocusManifest(env, "acme/manifest-driven", { settings: { mergeTrainMode: "enforce" } });
    const settings = await resolveRepositorySettings(env, "acme/manifest-driven");
    expect(settings.mergeTrainMode).toBe("enforce");
  });

  it("resolveRepositorySettings falls back to off when no manifest override is present", async () => {
    const env = createTestEnv();
    await upsertRepositorySettings(env, { repoFullName: "acme/no-manifest" });
    const settings = await resolveRepositorySettings(env, "acme/no-manifest");
    expect(settings.mergeTrainMode).toBe("off");
  });
});
