-- 1. Create budget_transactions table (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.budget_transactions (
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
DROP POLICY IF EXISTS "Users can only see their own transactions" ON public.budget_transactions;
CREATE POLICY "Users can only see their own transactions" ON public.budget_transactions
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can only insert their own transactions" ON public.budget_transactions;
CREATE POLICY "Users can only insert their own transactions" ON public.budget_transactions
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. Create helper function get_day_boundaries
CREATE OR REPLACE FUNCTION public.get_day_boundaries(p_user_id uuid, p_target_date date)
RETURNS TABLE(start_time timestamp with time zone, end_time timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_timezone TEXT;
  v_rollover_hour INTEGER;
  v_target_date_tz TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Fetch user settings
  SELECT timezone, day_rollover_hour INTO v_timezone, v_rollover_hour
  FROM public.profiles
  WHERE id = p_user_id;

  -- Default if not set
  IF v_timezone IS NULL THEN v_timezone := 'UTC'; END IF;
  IF v_rollover_hour IS NULL THEN v_rollover_hour := 0; END IF;

  -- Calculate the start time: Target Date + Rollover Hour (in TZ)
  v_target_date_tz := (p_target_date::text || ' ' || v_rollover_hour || ':00')::timestamp without time zone AT TIME ZONE v_timezone;

  start_time := v_target_date_tz;
  end_time := start_time + '1 day'::interval;

  -- DEBUG LOG: Output the calculated boundaries
  RAISE NOTICE '[get_day_boundaries] User: %, TZ: %, Rollover: %, Target Date: %, Start: %, End: %', 
    p_user_id, v_timezone, v_rollover_hour, p_target_date, start_time, end_time;

  RETURN NEXT;
END;
$function$;

-- 5. Create RPC function get_daily_spent_amount with detailed logging
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
  v_now TIMESTAMP WITH TIME ZONE;
BEGIN
  v_now := NOW();
  
  RAISE NOTICE '[get_daily_spent_amount] START for user: %, NOW (UTC): %', p_user_id, v_now;

  -- 1. Fetch user settings
  SELECT timezone, day_rollover_hour INTO v_timezone, v_rollover_hour
  FROM public.profiles
  WHERE id = p_user_id;

  RAISE NOTICE '[get_daily_spent_amount] Profile - Timezone: %, Rollover Hour: %', v_timezone, v_rollover_hour;

  -- Default if not set
  IF v_timezone IS NULL THEN v_timezone := 'UTC'; END IF;
  IF v_rollover_hour IS NULL THEN v_rollover_hour := 0; END IF;

  -- 2. Determine the target date based on rollover hour
  v_current_time_in_tz := (v_now AT TIME ZONE v_timezone)::time;
  
  RAISE NOTICE '[get_daily_spent_amount] Current time in user TZ: %', v_current_time_in_tz;
  
  IF v_current_time_in_tz < (v_rollover_hour || ':00')::time THEN
    v_target_date := (v_now AT TIME ZONE v_timezone)::date - 1;
    RAISE NOTICE '[get_daily_spent_amount] Before rollover, using yesterday: %', v_target_date;
  ELSE
    v_target_date := (v_now AT TIME ZONE v_timezone)::date;
    RAISE NOTICE '[get_daily_spent_amount] After rollover, using today: %', v_target_date;
  END IF;

  -- 3. Get the day boundaries
  SELECT start_time, end_time INTO v_boundaries
  FROM public.get_day_boundaries(p_user_id, v_target_date);

  RAISE NOTICE '[get_daily_spent_amount] Boundaries - Start: %, End: %', v_boundaries.start_time, v_boundaries.end_time;

  -- 4. Calculate total spent within those boundaries
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_spent
  FROM public.budget_transactions
  WHERE
    user_id = p_user_id AND
    created_at >= v_boundaries.start_time AND
    created_at < v_boundaries.end_time;

  RAISE NOTICE '[get_daily_spent_amount] Final total_spent: %', v_total_spent;

  -- Also log the raw transactions for debugging
  RAISE NOTICE '[get_daily_spent_amount] Sample transactions in range:';
  FOR record IN 
    SELECT amount, created_at, transaction_type 
    FROM public.budget_transactions 
    WHERE user_id = p_user_id 
      AND created_at >= v_boundaries.start_time 
      AND created_at < v_boundaries.end_time
    ORDER BY created_at DESC 
    LIMIT 5
  LOOP
    RAISE NOTICE '  - Amount: %, Type: %, Created: %', record.amount, record.transaction_type, record.created_at;
  END LOOP;

  RETURN v_total_spent;
END;
$function$;