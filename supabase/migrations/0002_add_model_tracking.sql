-- Add model tracking columns to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS extraction_model TEXT,
ADD COLUMN IF NOT EXISTS yield_estimation_model TEXT;

-- Add comments for documentation
COMMENT ON COLUMN recipes.extraction_model IS 'The LLM model used to extract this recipe (e.g., gemini-2.5-pro)';
COMMENT ON COLUMN recipes.yield_estimation_model IS 'The LLM model used to estimate the yield (e.g., gemini-2.0-flash)';
