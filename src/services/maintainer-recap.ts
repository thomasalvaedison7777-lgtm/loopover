// Maintainer-recap BUILDER (#2239, foundation for the #1963 recap digest).
//
// A PURE data-shaping seam: fold a window of gittensory's own review-outcome data across repos into a single
// serializable RecapReport. No delivery, no scheduling, no I/O, no model call — exactly the shape
// weekly-value-report.ts's buildWeeklyValueReport uses (inputs injected, report returned). The caller supplies
// each repo's two already-computed aggregators (services/gate-precision.ts buildGatePrecisionReport +
// services/outcome-calibration.ts buildRepoOutcomeCalibration, the same pair src/review/ops-wire.ts already
// loads together) so NO new D1 queries are added here.
//
// Distinct from services/review-recap.ts's buildReviewRecap: that is SINGLE-repo and sourced from gate merge-
// PREDICTION precision; this is MULTI-repo and sourced from the realized gate-block + recommendation-outcome
// calibration ledgers (blocked-then-merged false positives, maintainer overrides, recommendation reversals).
import { PUBLIC_LOCAL_PATH_SCRUB_PATTERN } from "../signals/redaction";
import type { GatePrecisionReport } from "./gate-precision";
import type { OutcomeCalibration } from "./outcome-calibration";
import type { MaintainerRecapRepo, RecapReport } from "../types";

const DEFAULT_WINDOW_DAYS = 7;
const MIN_WINDOW_DAYS = 1;
const MAX_WINDOW_DAYS = 90;

/** Clamp an arbitrary window-days input to a sane range; non-finite/omitted falls back to the weekly default.
 *  Mirrors review-recap.ts's normalizeWindowDays (same bounds). */
function normalizeWindowDays(value: number | null | undefined): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DEFAULT_WINDOW_DAYS;
  return Math.max(MIN_WINDOW_DAYS, Math.min(MAX_WINDOW_DAYS, Math.round(numeric)));
}

/** Public-safe scrub for any free text pulled into the recap (defense in depth — repo full names are the only
 *  free-text input today). Mirrors review-recap.ts's sanitizeRecapText. */
function sanitizeRecapText(value: string): string {
  return value.replace(PUBLIC_LOCAL_PATH_SCRUB_PATTERN, "<redacted-path>").slice(0, 240);
}

/** One repo's two already-computed aggregators. Both carry the SAME repoFullName; the gate report drives repo
 *  identity. Injected by the caller (no new D1 read here), exactly like buildWeeklyValueReport's inputs. */
export type MaintainerRecapRepoInput = { gatePrecision: GatePrecisionReport; calibration: OutcomeCalibration };

export type MaintainerRecapInputs = {
  generatedAt: string;
  windowDays?: number | null | undefined;
  repos: MaintainerRecapRepoInput[];
};

/** PURE recap builder: fold each repo's gate-precision + outcome-calibration reports into a {@link RecapReport}
 *  with per-repo counts and top-line gate/reversal totals. Never throws; an empty repo list yields a zeroed
 *  report with a null false-positive rate (nothing blocked ⇒ nothing to divide by). */
export function buildMaintainerRecap(args: MaintainerRecapInputs): RecapReport {
  const windowDays = normalizeWindowDays(args.windowDays);
  const repos: MaintainerRecapRepo[] = [];
  const totals = {
    reviewed: 0,
    merged: 0,
    closed: 0,
    blocked: 0,
    gateFalsePositives: 0,
    gateOverrides: 0,
    reversals: 0,
    gateFalsePositiveRate: null as number | null,
  };
  for (const { gatePrecision, calibration } of args.repos) {
    let merged = 0;
    let closed = 0;
    for (const band of calibration.slop.bands) {
      merged += band.merged;
      closed += band.closed;
    }
    let gateOverrides = 0;
    for (const perType of gatePrecision.perGateType) gateOverrides += perType.overridden;
    const repo: MaintainerRecapRepo = {
      repoFullName: sanitizeRecapText(gatePrecision.repoFullName),
      reviewed: calibration.slop.totalResolved,
      merged,
      closed,
      gateFalsePositives: gatePrecision.overall.blockedThenMerged,
      gateOverrides,
      reversals: calibration.recommendations.negative,
    };
    repos.push(repo);
    totals.reviewed += repo.reviewed;
    totals.merged += repo.merged;
    totals.closed += repo.closed;
    totals.blocked += gatePrecision.overall.blocked;
    totals.gateFalsePositives += repo.gateFalsePositives;
    totals.gateOverrides += repo.gateOverrides;
    totals.reversals += repo.reversals;
  }
  totals.gateFalsePositiveRate =
    totals.blocked > 0 ? Math.round((totals.gateFalsePositives / totals.blocked) * 100) / 100 : null;
  const rateLine =
    totals.gateFalsePositiveRate !== null
      ? `Gate false-positive rate: ${Math.round(totals.gateFalsePositiveRate * 100)}% (${totals.gateFalsePositives}/${totals.blocked} block(s) later merged).`
      : `Gate false-positive rate: not enough blocked PRs in the window to report.`;
  const summary = [
    `Maintainer recap over the last ${windowDays} day(s): ${repos.length} repo(s), ${totals.reviewed} reviewed, ${totals.merged} merged, ${totals.closed} closed.`,
    rateLine,
    `${totals.gateOverrides} maintainer override(s), ${totals.reversals} recommendation reversal(s).`,
  ].map(sanitizeRecapText);
  return { generatedAt: args.generatedAt, windowDays, repos, totals, summary };
}
