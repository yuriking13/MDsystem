-- Drop views that conflict with Prisma db push
-- Run this BEFORE prisma db push

DROP VIEW IF EXISTS user_activity_daily CASCADE;
