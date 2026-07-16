/**
 * Convergence (#6202/#6204): extracted to `@loopover/engine` so the maintainer gate and the miner's
 * own preflight share the identical, versioned limits instead of drifting apart. See this directory's
 * existing duplicate-winner.ts shim for the same pattern.
 *
 * packages/loopover-engine/src/signals/preflight-limits.ts is the source of truth.
 */
export { PREFLIGHT_LIMITS } from "../../packages/loopover-engine/src/signals/preflight-limits";
