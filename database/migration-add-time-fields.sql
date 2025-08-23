-- Add start_time and end_time fields to schedules table
-- Migration: Add time fields to schedules table

-- Add start_time and end_time columns to schedules table
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME;

-- Update existing records to have default time values
UPDATE schedules 
SET 
    start_time = '09:00:00',
    end_time = '10:00:00'
WHERE start_time IS NULL OR end_time IS NULL;

-- Make the columns NOT NULL after setting default values
ALTER TABLE schedules 
ALTER COLUMN start_time SET NOT NULL,
ALTER COLUMN end_time SET NOT NULL;

-- Set default values for future records
ALTER TABLE schedules 
ALTER COLUMN start_time SET DEFAULT '09:00:00',
ALTER COLUMN end_time SET DEFAULT '10:00:00';

-- Add index for better performance on time-based queries
CREATE INDEX IF NOT EXISTS idx_schedules_start_time ON schedules(start_time);
CREATE INDEX IF NOT EXISTS idx_schedules_end_time ON schedules(end_time);

-- Add comment for documentation
COMMENT ON COLUMN schedules.start_time IS '일정 시작 시간 (HH:MM:SS)';
COMMENT ON COLUMN schedules.end_time IS '일정 종료 시간 (HH:MM:SS)';
