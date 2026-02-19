-- Edition/trim option when adding a car (e.g. "GT Line", "Limited Edition")
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS edition text DEFAULT NULL;

-- Comment when car is marked as modified (max 500 chars, shown on garage card)
ALTER TABLE public.cars ADD COLUMN IF NOT EXISTS modified_comment text DEFAULT NULL;
ALTER TABLE public.cars ADD CONSTRAINT cars_modified_comment_length CHECK (modified_comment IS NULL OR char_length(modified_comment) <= 500);
