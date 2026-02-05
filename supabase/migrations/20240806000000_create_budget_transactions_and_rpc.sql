-- 1. Create budget_transactions table
CREATE TABLE public.budget_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  category_id TEXT,
  description TEXT,
  transaction_type TEXT NOT NULL, -- 'token_spend', 'custom_spend', 'generic_spend'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Users can only see their own transactions" ON public.budget_transactions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own transactions" ON public.budget_transactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Create RPC function get_daily_spent_amount
-- This function calculates the total spent today based on user's timezone and rollover hour.
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
  v_boundaries RECORD;
  v_total_spent NUMERIC;
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

  -- 3. Get the day boundaries using the existing function
  SELECT start_time, end_time INTO v_boundaries
  FROM public.get_day_boundaries(p_user_id, v_target_date);

  -- 4. Calculate total spent within those boundaries
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_spent
  FROM public.budget_transactions
  WHERE
    user_id = p_user_id AND
    created_at >= v_boundaries.start_time AND
    created_at < v_boundaries.end_time;

  RETURN v_total_spent;
END;
$function$;