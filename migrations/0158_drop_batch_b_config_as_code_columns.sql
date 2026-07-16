-- Config-as-code migration (Batch B, loopover#6443/epic #6440): these 15 fields already parse correctly
-- from .loopover.yml's settings: block (confirmed via audit, including the sparse-merge composite fields
-- typeLabels/linkedIssueLabelPropagation, which resolveEffectiveSettings merges a manifest partial onto a
-- base -- that base now always resolves to the built-in default (DEFAULT_TYPE_LABELS/
-- DEFAULT_LINKED_ISSUE_LABEL_PROPAGATION) rather than a stale DB customization, since getRepositorySettings
-- no longer reads a real per-repo value for these columns). Same dead-column-cleanup shape as Batch A
-- (migration 0157) and the earlier 0122/0146/0150 precedents. SQLite 3.35+ / D1 supports DROP COLUMN
-- directly.
--
-- contributor_blacklist_json here is the PER-REPO override column on repository_settings -- distinct from
-- the separate global_contributor_blacklist table (untouched by this migration), which still has its own
-- contributor_blacklist_json column and its own parseContributorBlacklist read path.
ALTER TABLE repository_settings DROP COLUMN gittensor_label;
ALTER TABLE repository_settings DROP COLUMN blacklist_label;
ALTER TABLE repository_settings DROP COLUMN create_missing_label;
ALTER TABLE repository_settings DROP COLUMN type_labels_enabled;
ALTER TABLE repository_settings DROP COLUMN type_labels_json;
ALTER TABLE repository_settings DROP COLUMN linked_issue_label_propagation_json;
ALTER TABLE repository_settings DROP COLUMN contributor_blacklist_json;
ALTER TABLE repository_settings DROP COLUMN moderation_gate_mode;
ALTER TABLE repository_settings DROP COLUMN moderation_rules_json;
ALTER TABLE repository_settings DROP COLUMN moderation_warning_label;
ALTER TABLE repository_settings DROP COLUMN moderation_banned_label;
ALTER TABLE repository_settings DROP COLUMN review_evasion_protection;
ALTER TABLE repository_settings DROP COLUMN review_evasion_label;
ALTER TABLE repository_settings DROP COLUMN review_evasion_comment;
ALTER TABLE repository_settings DROP COLUMN merge_train_mode;
