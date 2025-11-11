-- Repeatable migration to (re)create reporting views for O*NET / JAAT datasets

CREATE SCHEMA IF NOT EXISTS reporting;

DROP MATERIALIZED VIEW IF EXISTS reporting.onet_skill_coverage;
CREATE MATERIALIZED VIEW reporting.onet_skill_coverage AS
SELECT
    o.onet_soc_code,
    o.preferred_label,
    COUNT(os.skill_code) AS skill_count,
    AVG(os.importance)::numeric(10, 2) AS avg_importance,
    AVG(os.level)::numeric(10, 2) AS avg_level,
    COUNT(DISTINCT t.task_code) AS task_count,
    MAX(o.source) AS occupation_source,
    MAX(os.source) AS skill_link_source
FROM onet_occupations o
LEFT JOIN onet_occupation_skills os
    ON o.onet_soc_code = os.onet_soc_code
LEFT JOIN jaat_tasks t
    ON o.onet_soc_code = t.onet_soc_code
GROUP BY o.onet_soc_code, o.preferred_label
ORDER BY o.onet_soc_code;

DROP MATERIALIZED VIEW IF EXISTS reporting.onet_skill_category_summary;
CREATE MATERIALIZED VIEW reporting.onet_skill_category_summary AS
SELECT
    COALESCE(s.category, 'Uncategorized') AS category,
    COUNT(DISTINCT s.skill_code) AS skill_count,
    COUNT(DISTINCT os.onet_soc_code) AS occupation_coverage,
    MAX(s.source) AS latest_source
FROM onet_skills s
LEFT JOIN onet_occupation_skills os
    ON s.skill_code = os.skill_code
GROUP BY COALESCE(s.category, 'Uncategorized')
ORDER BY category;

CREATE OR REPLACE VIEW reporting.onet_source_versions AS
SELECT entity, source, record_count
FROM (
    SELECT 'onet_occupations' AS entity, source, COUNT(*) AS record_count
    FROM onet_occupations
    GROUP BY source
    UNION ALL
    SELECT 'onet_skills' AS entity, source, COUNT(*) AS record_count
    FROM onet_skills
    GROUP BY source
    UNION ALL
    SELECT 'onet_occupation_skills' AS entity, source, COUNT(*) AS record_count
    FROM onet_occupation_skills
    GROUP BY source
    UNION ALL
    SELECT 'jaat_tasks' AS entity, source, COUNT(*) AS record_count
    FROM jaat_tasks
    GROUP BY source
) AS aggregated
ORDER BY entity, source;

REFRESH MATERIALIZED VIEW reporting.onet_skill_coverage;
REFRESH MATERIALIZED VIEW reporting.onet_skill_category_summary;
