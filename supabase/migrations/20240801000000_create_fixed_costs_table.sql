-- Create fixed_costs table
CREATE TABLE public.fixed_costs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weekly_amount NUMERIC(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

-- Policies for user-specific access
CREATE POLICY "Users can only see their own fixed costs" ON public.fixed_costs
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own fixed costs" ON public.fixed_costs
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own fixed costs" ON public.fixed_costs
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own fixed costs" ON public.fixed_costs
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Trigger to update 'updated_at' column
CREATE TRIGGER on_fixed_costs_updated
  BEFORE UPDATE ON public.fixed_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();