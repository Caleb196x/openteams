use serde_json::{Value, json};
use services::services::config::{Config, KeyboardShortcutOverride, ThemeMode};

fn v9_fixture() -> Value {
    let mut value = serde_json::to_value(Config::default()).expect("serialize default config");
    let object = value.as_object_mut().expect("config object");
    object.insert("config_version".to_string(), json!("v9"));
    object.remove("keyboard_shortcuts");
    object.insert("theme".to_string(), json!("DARK"));
    object.insert(
        "workspace_dir".to_string(),
        json!("/tmp/original-workspace"),
    );
    object.insert(
        "worktree_sessions_dir".to_string(),
        json!("/tmp/original-worktrees"),
    );
    value
}

#[test]
fn default_config_has_empty_v10_shortcuts() {
    let config = Config::default();
    assert_eq!(config.config_version, "v10");
    assert_eq!(config.keyboard_shortcuts.schema_version, 1);
    assert!(config.keyboard_shortcuts.platform_overrides.is_empty());
}

#[test]
fn v9_migration_preserves_existing_fields_and_presets() {
    let old = v9_fixture();
    let old_presets = old["chat_presets"].clone();
    let migrated = Config::try_from_raw_config(&old.to_string()).expect("migrate v9");
    assert!(matches!(migrated.theme, ThemeMode::Dark));
    assert_eq!(
        migrated.workspace_dir.as_deref(),
        Some("/tmp/original-workspace")
    );
    assert_eq!(
        migrated.worktree_sessions_dir.as_deref(),
        Some("/tmp/original-worktrees"),
    );
    assert_eq!(
        serde_json::to_value(&migrated.chat_presets).expect("serialize migrated presets"),
        old_presets,
    );
    assert!(migrated.keyboard_shortcuts.platform_overrides.is_empty());
}

#[test]
fn three_platforms_empty_sequence_and_unknown_command_round_trip() {
    let mut value = serde_json::to_value(Config::default()).expect("serialize default config");
    value["keyboard_shortcuts"] = json!({
        "schema_version": 1,
        "platform_overrides": {
            "macos": {
                "session.create": { "sequence": [] },
                "future.command": { "sequence": ["meta+9"] }
            },
            "windows": { "search.open": { "sequence": ["ctrl+k"] } },
            "linux": { "search.open": { "sequence": ["ctrl+k", "p"] } }
        }
    });
    let loaded = Config::try_from_raw_config(&value.to_string()).expect("read v10");
    let encoded = serde_json::to_string(&loaded).expect("serialize v10");
    let decoded = Config::try_from_raw_config(&encoded).expect("read serialized v10");
    assert_eq!(decoded.keyboard_shortcuts, loaded.keyboard_shortcuts);
    assert!(matches!(
        &decoded.keyboard_shortcuts.platform_overrides["macos"]["session.create"],
        KeyboardShortcutOverride::Binding(binding) if binding.sequence.is_empty()
    ));
    assert!(decoded.keyboard_shortcuts.platform_overrides["macos"].contains_key("future.command"));
}

#[test]
fn invalid_override_does_not_erase_sibling_or_outer_config() {
    let mut value = serde_json::to_value(Config::default()).expect("serialize default config");
    value["theme"] = json!("DARK");
    value["keyboard_shortcuts"] = json!({
        "schema_version": 1,
        "platform_overrides": {
            "macos": {
                "broken": { "no_sequence": true },
                "session.create": { "sequence": ["meta+n"] }
            }
        }
    });
    let loaded = Config::try_from_raw_config(&value.to_string()).expect("tolerant read");
    assert!(matches!(loaded.theme, ThemeMode::Dark));
    assert!(matches!(
        &loaded.keyboard_shortcuts.platform_overrides["macos"]["broken"],
        KeyboardShortcutOverride::Invalid(_)
    ));
    assert!(matches!(
        &loaded.keyboard_shortcuts.platform_overrides["macos"]["session.create"],
        KeyboardShortcutOverride::Binding(_)
    ));
}

#[test]
fn unknown_shortcut_schema_returns_diagnostic_error() {
    let mut value = serde_json::to_value(Config::default()).expect("serialize default config");
    value["keyboard_shortcuts"]["schema_version"] = json!(2);
    let error = Config::try_from_raw_config(&value.to_string())
        .expect_err("future schema must not silently fall back");
    assert!(
        error
            .to_string()
            .contains("Unsupported keyboard shortcut schema version: 2")
    );
}
