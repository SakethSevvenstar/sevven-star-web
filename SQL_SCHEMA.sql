-- Sevven Star Industries — Database Schema
-- Paste this entire file into Supabase SQL Editor and run it

-- Machines table
CREATE TABLE machines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  grade TEXT,
  qr TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wire grades table
CREATE TABLE grades (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stock lots table
CREATE TABLE lots (
  id TEXT PRIMARY KEY,
  grade TEXT NOT NULL REFERENCES grades(name) ON DELETE RESTRICT,
  received NUMERIC NOT NULL,
  supplier TEXT,
  date_received TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Consumption entries table
CREATE TABLE consumption (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  grade TEXT NOT NULL REFERENCES grades(name) ON DELETE RESTRICT,
  lot_id TEXT REFERENCES lots(id) ON DELETE SET NULL,
  qty_kg NUMERIC NOT NULL,
  operator TEXT,
  ts TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Downtime events table
CREATE TABLE downtime (
  id TEXT PRIMARY KEY,
  machine_id TEXT NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  note TEXT,
  operator TEXT,
  opened_at TIMESTAMPTZ NOT NULL,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Config table (for inventory parameters)
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_consumption_machine ON consumption(machine_id);
CREATE INDEX idx_consumption_ts ON consumption(ts);
CREATE INDEX idx_downtime_machine ON downtime(machine_id);
CREATE INDEX idx_downtime_opened ON downtime(opened_at);
CREATE INDEX idx_lots_grade ON lots(grade);
