-- Create O*NET / JAAT reference tables used by ops/scripts/seed-onet-data.py

CREATE TABLE IF NOT EXISTS onet_occupations (
    onet_soc_code text PRIMARY KEY,
    jaat_job_id text,
    preferred_label text NOT NULL,
    description text,
    source text NOT NULL
);

CREATE TABLE IF NOT EXISTS onet_skills (
    skill_code text PRIMARY KEY,
    name text NOT NULL,
    category text,
    description text,
    source text NOT NULL
);

CREATE TABLE IF NOT EXISTS onet_occupation_skills (
    onet_soc_code text NOT NULL,
    skill_code text NOT NULL,
    importance integer,
    level numeric,
    source text NOT NULL,
    CONSTRAINT onet_occupation_skills_pkey PRIMARY KEY (onet_soc_code, skill_code),
    CONSTRAINT onet_occupation_skills_onet_soc_code_fkey
        FOREIGN KEY (onet_soc_code) REFERENCES onet_occupations (onet_soc_code)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT onet_occupation_skills_skill_code_fkey
        FOREIGN KEY (skill_code) REFERENCES onet_skills (skill_code)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS onet_occupation_skills_skill_code_idx
    ON onet_occupation_skills (skill_code);

CREATE TABLE IF NOT EXISTS jaat_tasks (
    task_code text PRIMARY KEY,
    onet_soc_code text,
    description text NOT NULL,
    source text NOT NULL,
    CONSTRAINT jaat_tasks_onet_soc_code_fkey
        FOREIGN KEY (onet_soc_code) REFERENCES onet_occupations (onet_soc_code)
        ON DELETE SET NULL ON UPDATE CASCADE
);
