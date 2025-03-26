CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  reference_number TEXT NOT NULL UNIQUE,
  student_name TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  has_voted BOOLEAN NOT NULL DEFAULT FALSE,
  school_level TEXT
);

CREATE TABLE IF NOT EXISTS party_lists (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  color TEXT NOT NULL DEFAULT '#0088FE'
);

CREATE TABLE IF NOT EXISTS positions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS candidates (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  position_id INTEGER NOT NULL,
  party_list_id INTEGER NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  school_level TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  left_logo_url TEXT NOT NULL,
  right_logo_url TEXT NOT NULL
);

-- Insert admin user
INSERT INTO users (reference_number, student_name, is_admin)
VALUES ('ARSC2025', 'admin', true)
ON CONFLICT DO NOTHING;

-- Insert initial party lists
INSERT INTO party_lists (name, color)
VALUES 
  ('Nacionalista Party', '#0088FE'),
  ('Liberal Party', '#00C49F')
ON CONFLICT DO NOTHING;

-- Insert initial positions
INSERT INTO positions (name, display_order)
VALUES 
  ('President', 1),
  ('Vice President', 2),
  ('Secretary', 3),
  ('Treasurer', 4),
  ('Auditor', 5),
  ('PRO', 6)
ON CONFLICT DO NOTHING;

-- Insert system settings
INSERT INTO system_settings (left_logo_url, right_logo_url)
VALUES (
  'https://images.unsplash.com/photo-1580982773321-5c9f15ea8559?w=128&h=128&fit=crop',
  'https://images.unsplash.com/photo-1580982773456-25198163659c?w=128&h=128&fit=crop'
)
ON CONFLICT DO NOTHING;
