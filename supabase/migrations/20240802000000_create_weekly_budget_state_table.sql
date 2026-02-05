-- Create the table to store the user's weekly budget state
CREATE TABLE public.weekly_budget_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  gear_travel_fund NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.weekly_budget_state ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own budget state
CREATE POLICY "Users can view their own budget state" ON public.weekly_budget_state
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Policy: Users can insert their own initial budget state
CREATE POLICY "Users can insert their own budget state" ON public.weekly_budget_state
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own budget state
CREATE POLICY "Users can update their own budget state" ON public.weekly_budget_state
FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own budget state (optional, but good practice)
CREATE POLICY "Users can delete their own budget state" ON public.weekly_budget_state
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Create a trigger to automatically update the 'updated_at' timestamp
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.weekly_budget_state
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();