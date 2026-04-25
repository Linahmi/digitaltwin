/**
 * lib/db/sqlite.ts
 *
 * Single SQLite connection (better-sqlite3) used throughout the backend.
 * Database file: ./data/synthea.db (configurable via DATABASE_PATH env).
 *
 * Migration path to PostgreSQL:
 *   Replace this module with a pg/postgres client; all callers in
 *   lib/db/patientContext.ts use the same query interface, so only
 *   the SQL dialect needs updating (e.g. $1/$2 placeholders instead
 *   of ? for positional params in PostgreSQL).
 *
 * Migration path to a FHIR server (Azure Health Data Services, HAPI FHIR):
 *   Replace scripts/import-synthea.ts with a FHIR REST client and skip
 *   SQLite entirely. lib/db/patientContext.ts would call the FHIR API
 *   instead of querying this DB.
 */

import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'data', 'synthea.db')

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })

const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id            TEXT PRIMARY KEY,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    birth_date    TEXT,
    gender        TEXT,
    race          TEXT,
    ethnicity     TEXT,
    marital_status TEXT
  );

  CREATE TABLE IF NOT EXISTS conditions (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL REFERENCES patients(id),
    code          TEXT,
    display       TEXT NOT NULL,
    onset_date    TEXT,
    abatement_date TEXT,
    status        TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS medications (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL REFERENCES patients(id),
    code          TEXT,
    display       TEXT NOT NULL,
    dosage        TEXT,
    frequency     TEXT,
    start_date    TEXT,
    end_date      TEXT,
    status        TEXT DEFAULT 'active'
  );

  CREATE TABLE IF NOT EXISTS observations (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL REFERENCES patients(id),
    code          TEXT NOT NULL,
    display       TEXT NOT NULL,
    value         REAL,
    value_string  TEXT,
    unit          TEXT,
    effective_date TEXT
  );

  CREATE TABLE IF NOT EXISTS allergies (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL REFERENCES patients(id),
    substance     TEXT NOT NULL,
    status        TEXT DEFAULT 'active',
    recorded_date TEXT
  );

  CREATE TABLE IF NOT EXISTS encounters (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT NOT NULL REFERENCES patients(id),
    type          TEXT,
    start_date    TEXT,
    end_date      TEXT,
    reason_display TEXT
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_conditions_patient  ON conditions(patient_id);
  CREATE INDEX IF NOT EXISTS idx_conditions_display  ON conditions(display);
  CREATE INDEX IF NOT EXISTS idx_medications_patient ON medications(patient_id);
  CREATE INDEX IF NOT EXISTS idx_observations_patient ON observations(patient_id);
  CREATE INDEX IF NOT EXISTS idx_observations_code   ON observations(code);
  CREATE INDEX IF NOT EXISTS idx_allergies_patient   ON allergies(patient_id);
  CREATE INDEX IF NOT EXISTS idx_encounters_patient  ON encounters(patient_id);
  CREATE INDEX IF NOT EXISTS idx_patients_birth_date ON patients(birth_date);

  CREATE TABLE IF NOT EXISTS pubmed_cache (
    query TEXT PRIMARY KEY,
    results_json TEXT,
    created_at TEXT
  );
`)

export default db
