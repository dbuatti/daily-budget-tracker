-- Create table for storing the user's weekly budget state
CREATE TABLE public.weekly_budget_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  current_tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  gear_travel_fund NUMERIC NOT NULL DEFAULT 0.00,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.weekly_budget_state ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own budget state" ON public.weekly_budget_state
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget state" ON public.weekly_budget_state
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget state" ON public.weekly_budget_state
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Trigger to automatically update 'updated_at' column
CREATE TRIGGER on_weekly_budget_state_updated
  BEFORE UPDATE ON public.weekly_budget_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();