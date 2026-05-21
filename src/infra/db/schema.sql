-- ============================================================
--  schema.sql
--  Schema completo do wppbot. É aplicado automaticamente no
--  startup do bot (src/db/migrate.js) usando CREATE IF NOT
--  EXISTS, então é seguro rodar várias vezes (idempotente).
-- ============================================================

-- ── Grupos do WhatsApp em que o bot atuou ─────────────────
CREATE TABLE IF NOT EXISTS groups (
  id                  TEXT PRIMARY KEY,            -- ex.: 120363025XXXXXXXXX@g.us
  name                TEXT NOT NULL DEFAULT '',
  participants_count  INTEGER NOT NULL DEFAULT 0,
  allowed             BOOLEAN NOT NULL DEFAULT FALSE,
  first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Participantes conhecidos de cada grupo ────────────────
CREATE TABLE IF NOT EXISTS group_participants (
  group_id      TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  phone         TEXT NOT NULL,                     -- só dígitos (ex: 5511999999999)
  wa_id         TEXT,                              -- id completo "5511999999999@c.us"
  pushname      TEXT,
  display_name  TEXT,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, phone)
);

-- ── Líderes selecionados POR grupo ────────────────────────
CREATE TABLE IF NOT EXISTS group_leaders (
  group_id   TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  phone      TEXT NOT NULL,                       -- só dígitos
  pushname   TEXT,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_group_leaders_phone ON group_leaders (phone);

-- ── Histórico persistente de perguntas/respostas ──────────
CREATE TABLE IF NOT EXISTS qa_history (
  id            BIGSERIAL PRIMARY KEY,
  group_id      TEXT,
  group_name    TEXT,
  leader_phone  TEXT,
  question      TEXT NOT NULL,
  answer        TEXT NOT NULL,
  source        TEXT NOT NULL,                    -- cache | ai | fallback
  elapsed_ms    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Colunas de telemetria de IA (adicionadas em migração; idempotente).
ALTER TABLE qa_history ADD COLUMN IF NOT EXISTS provider     TEXT;
ALTER TABLE qa_history ADD COLUMN IF NOT EXISTS model        TEXT;
ALTER TABLE qa_history ADD COLUMN IF NOT EXISTS tokens_in    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE qa_history ADD COLUMN IF NOT EXISTS tokens_out   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE qa_history ADD COLUMN IF NOT EXISTS cost_usd     NUMERIC(12,8) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_qa_history_created ON qa_history (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_history_group   ON qa_history (group_id, created_at DESC);

-- ── Cache persistente de respostas (evita re-chamar IA pós-restart) ──
CREATE TABLE IF NOT EXISTS qa_cache (
  key          TEXT PRIMARY KEY,                 -- hashKey(question)
  question     TEXT NOT NULL,                    -- forma normalizada (debug/inspeção)
  answer       TEXT NOT NULL,
  provider     TEXT,
  model        TEXT,
  hits         INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qa_cache_expires ON qa_cache (expires_at);

-- ── Configurações runtime do bot (chave/valor) ────────────
CREATE TABLE IF NOT EXISTS bot_config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
