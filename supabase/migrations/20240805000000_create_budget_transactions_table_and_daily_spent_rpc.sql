-- Create budget_transactions table
CREATE TABLE public.budget_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL,
  category_id TEXT, -- A1, B2, Z1, etc.
  description TEXT,
  transaction_type TEXT NOT NULL, -- 'token_spend', 'custom_spend', 'generic_spend'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (REQUIRED)
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for budget_transactions
CREATE POLICY "Users can only see their own budget transactions" ON public.budget_transactions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own budget transactions" ON public.budget_transactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget transactions" ON public.budget_transactions
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own budget transactions" ON public.budget_transactions
FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- RPC function to calculate daily spent amount based on user's day rollover settings
CREATE OR REPLACE FUNCTION public.get_daily_spent_amount(p_user_id uuid)
 RETURNS NUMERIC
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_timezone TEXT;
  v_rollover_hour INTEGER;
  v_current_time_in_tz TIME;
  v_target_date DATE;
  v_start_time TIMESTAMP WITH TIME ZONE;
  v_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1. Fetch user settings
  SELECT timezone, day_rollover_hour INTO v_timezone, v_rollover_hour
  FROM public.profiles
  WHERE id = p_user_id;

  -- Default if not set
  IF v_timezone IS NULL THEN v_timezone := 'UTC'; END IF;
  IF v_rollover_hour IS NULL THEN v_rollover_hour := 0; END IF;

  -- 2. Determine the target date based on rollover hour
  v_current_time_in_tz := (NOW() AT TIME ZONE v_timezone)::time;
  
  IF v_current_time_in_tz < (v_rollover_hour || ':00')::time THEN
    v_target_date := (NOW() AT TIME ZONE v_timezone)::date - 1;
  ELSE
    v_target_date := (NOW() AT TIME ZONE v_timezone)::date;
  END IF;

  -- 3. Calculate the start and end time of the budget day
  v_start_time := (v_target_date::text || ' ' || v_rollover_hour || ':00')::timestamp without time zone AT TIME ZONE v_timezone;
  v_end_time := v_start_time + '1 day'::interval;

  -- 4. Sum the amounts from budget_transactions within those boundaries
  RETURN (
    SELECT COALESCE(SUM(amount), 0)
    FROM public.budget_transactions
    WHERE
      user_id = p_user_id AND
      created_at >= v_start_time AND
      created_at < v_end_time
  );
END;
$function$;