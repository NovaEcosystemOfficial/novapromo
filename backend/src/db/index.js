import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

let db;

export function getDb() {
  if (!db) {
    const dir = path.dirname(config.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new DatabaseSync(config.dbPath);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');
    initSchema(db);
    migrateSchema(db);
  }
  return db;
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS connected_accounts (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL CHECK(platform IN ('instagram', 'tiktok')),
      external_user_id TEXT NOT NULL,
      username TEXT,
      display_name TEXT,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      token_expires_at TEXT,
      scopes TEXT,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(platform, external_user_id)
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      project TEXT NOT NULL,
      platform TEXT NOT NULL,
      content_type TEXT NOT NULL,
      tone TEXT NOT NULL,
      topic TEXT DEFAULT '',
      caption TEXT NOT NULL DEFAULT '',
      hashtags TEXT NOT NULL DEFAULT '',
      cta TEXT DEFAULT '',
      reel_idea TEXT DEFAULT '',
      overlay_title TEXT DEFAULT '',
      media_path TEXT,
      media_mime_type TEXT,
      scheduled_at TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      error_message TEXT,
      instagram_media_id TEXT,
      instagram_container_id TEXT,
      tiktok_publish_id TEXT,
      published_at TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS publication_logs (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at ON posts(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_posts_project ON posts(project);
    CREATE INDEX IF NOT EXISTS idx_publication_logs_post_id ON publication_logs(post_id);

    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      id TEXT PRIMARY KEY,
      uid TEXT NOT NULL,
      open_id TEXT NOT NULL UNIQUE,
      display_name TEXT,
      username TEXT,
      avatar_url TEXT,
      access_token_encrypted TEXT NOT NULL,
      refresh_token_encrypted TEXT,
      expires_at TEXT,
      refresh_expires_at TEXT,
      updated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

    CREATE TABLE IF NOT EXISTS brand_profiles (
      owner_uid TEXT PRIMARY KEY,
      profile_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function migrateSchema(database) {
  const columns = [
    ['topic', 'TEXT DEFAULT \'\''],
    ['cta', 'TEXT DEFAULT \'\''],
    ['reel_idea', 'TEXT DEFAULT \'\''],
    ['overlay_title', 'TEXT DEFAULT \'\''],
    ['view_count', 'INTEGER NOT NULL DEFAULT 0'],
  ];

  for (const [name, type] of columns) {
    try {
      database.exec(`ALTER TABLE posts ADD COLUMN ${name} ${type}`);
    } catch {
      // column already exists
    }
  }

  for (const [name, type] of [
    ['refresh_expires_at', 'TEXT'],
    ['updated_at', 'TEXT'],
  ]) {
    try {
      database.exec(`ALTER TABLE user_sessions ADD COLUMN ${name} ${type}`);
    } catch {
      // column already exists
    }
  }

  try {
    database.exec(`ALTER TABLE posts ADD COLUMN media_public_url TEXT`);
  } catch {
    // column already exists
  }

  try {
    database.exec(`ALTER TABLE oauth_states ADD COLUMN code_verifier TEXT`);
  } catch {
    // column already exists
  }
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
