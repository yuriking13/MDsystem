-- Rollback for add_med_publisher_v1.sql
-- Drops only objects created for medical publisher workflow.

DROP TABLE IF EXISTS med_publisher_timeline_events;
DROP TABLE IF EXISTS med_publisher_reviews;
DROP TABLE IF EXISTS med_publisher_submissions;
DROP TABLE IF EXISTS med_publisher_editors;
