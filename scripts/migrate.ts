/**
 * scripts/migrate.ts
 *
 * Creates all required tables in Neon Postgres.
 * Run once before importing data: npx tsx scripts/migrate.ts
 *
 * Requires DATABASE_URL in environment (copy from .env.local).
 */

import { neonConfig, Pool } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('❌  DATABASE_URL is not set. Copy it from your Neon project dashboard.')
    process.exit(1)
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  console.log('\n🚀  Running schema migration against Neon...\n')

  await pool.query(`
    CREATE TABLE IF NOT EXISTS patients (
      id             TEXT PRIMARY KEY,
      first_name     TEXT NOT NULL,
      last_name      TEXT NOT NULL,
      birth_date     TEXT,
      gender         TEXT,
      race           TEXT,
      ethnicity      TEXT,
      marital_status TEXT
    );

    CREATE TABLE IF NOT EXISTS conditions (
      id               TEXT PRIMARY KEY,
      patient_id       TEXT NOT NULL REFERENCES patients(id),
      code             TEXT,
      display          TEXT NOT NULL,
      onset_date       TEXT,
      abatement_date   TEXT,
      status           TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS medications (
      id          TEXT PRIMARY KEY,
      patient_id  TEXT NOT NULL REFERENCES patients(id),
      code        TEXT,
      display     TEXT NOT NULL,
      dosage      TEXT,
      frequency   TEXT,
      start_date  TEXT,
      end_date    TEXT,
      status      TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS observations (
      id             TEXT PRIMARY KEY,
      patient_id     TEXT NOT NULL REFERENCES patients(id),
      code           TEXT NOT NULL,
      display        TEXT NOT NULL,
      value          DOUBLE PRECISION,
      value_string   TEXT,
      unit           TEXT,
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
      id             TEXT PRIMARY KEY,
      patient_id     TEXT NOT NULL REFERENCES patients(id),
      type           TEXT,
      start_date     TEXT,
      end_date       TEXT,
      reason_display TEXT
    );

    CREATE TABLE IF NOT EXISTS pubmed_cache (
      query        TEXT PRIMARY KEY,
      results_json TEXT,
      created_at   TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_conditions_patient   ON conditions(patient_id);
    CREATE INDEX IF NOT EXISTS idx_conditions_display   ON conditions(display);
    CREATE INDEX IF NOT EXISTS idx_medications_patient  ON medications(patient_id);
    CREATE INDEX IF NOT EXISTS idx_observations_patient ON observations(patient_id);
    CREATE INDEX IF NOT EXISTS idx_observations_code    ON observations(code);
    CREATE INDEX IF NOT EXISTS idx_allergies_patient    ON allergies(patient_id);
    CREATE INDEX IF NOT EXISTS idx_encounters_patient   ON encounters(patient_id);
    CREATE INDEX IF NOT EXISTS idx_patients_birth_date  ON patients(birth_date);
  `)

  console.log('✅  Schema applied successfully.\n')
  await pool.end()
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
