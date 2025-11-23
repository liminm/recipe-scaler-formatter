-- Add yield estimation columns to recipes table
ALTER TABLE recipes 
ADD COLUMN IF NOT EXISTS estimated_final_weight_g DECIMAL,
ADD COLUMN IF NOT EXISTS yield_confidence TEXT CHECK (yield_confidence IN ('high', 'medium', 'low'));

-- Add comment for documentation
COMMENT ON COLUMN recipes.estimated_final_weight_g IS 'Automatically calculated final weight of the finished recipe based on ingredients and cooking methods';
COMMENT ON COLUMN recipes.yield_confidence IS 'Confidence level of the yield estimate: high, medium, or low';
