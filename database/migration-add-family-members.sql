-- Add family_members column to existing schedules table
-- This migration adds the family_members JSONB column with a default value

-- Add the new column
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '["family"]'::jsonb;

-- Update existing records to have the default family value
UPDATE schedules 
SET family_members = '["family"]'::jsonb 
WHERE family_members IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE schedules 
ALTER COLUMN family_members SET NOT NULL;

-- Add an index for better performance when filtering by family members
CREATE INDEX IF NOT EXISTS idx_schedules_family_members ON schedules USING GIN (family_members);

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'schedules' 
AND column_name = 'family_members';

