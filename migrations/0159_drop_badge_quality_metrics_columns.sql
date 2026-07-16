-- Config-as-code migration (Batch A follow-up, loopover#6442/epic #6440): badgeEnabled and
-- publicQualityMetrics were deliberately excluded from 0157's drop because loadPublicRepoBadge/
-- loadPublicRepoQualityMetrics (src/api/routes.ts) read them via a raw getRepositorySettings call that
-- bypasses the manifest overlay -- a perf tradeoff for two unauthenticated, high-frequency public routes.
-- Both routes now read resolveRepositorySettings (manifest-aware) instead, accepting that tradeoff so
-- .loopover.yml is honored for these two fields like every other settings.* field. Each live repo's
-- current effective value was confirmed unchanged (false) before this drop. SQLite 3.35+ / D1 supports
-- DROP COLUMN directly (same precedent as 0122/0146/0150/0157).
ALTER TABLE repository_settings DROP COLUMN badge_enabled;
ALTER TABLE repository_settings DROP COLUMN public_quality_metrics;
