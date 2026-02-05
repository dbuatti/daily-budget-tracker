-- Create a debug RPC that returns detailed information about the calculation
CREATE OR REPLACE FUNCTION public.debug_daily_spent(p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_timezone TEXT;
  v_rollover_hour INTEGER;
  v_now TIMESTAMP WITH TIME ZONE;
  v_current_time_in_tz TIME;
  v_target_date DATE;
  v_boundaries RECORD;
  v_total_spent NUMERIC;
  v_transactions_count INTEGER;
  v_sample_transactions jsonb;
BEGIN
  v_now := NOW();
  
  -- Get user profile
  SELECT timezone, day_rollover_hour INTO v_timezone, v_rollover_hour
  FROM public.profiles
  WHERE id = p_user_id;

  -- Defaults
  IF v_timezone IS NULL THEN v_timezone := 'UTC'; END IF;
  IF v_rollover_hour IS NULL THEN v_rollover_hour := 0; END IF;

  -- Current time in user's timezone
  v_current_time_in_tz := (v_now AT TIME ZONE v_timezone)::time;
  
  -- Determine target date
  IF v_current_time_in_tz < (v_rollover_hour || ':00')::time THEN
    v_target_date := (v_now AT TIME ZONE v_timezone)::date - 1;
  ELSE
    v_target_date := (v_now AT TIME ZONE v_timezone)::date;
  END IF;

  -- Get boundaries
  SELECT start_time, end_time INTO v_boundaries
  FROM public.get_day_boundaries(p_user_id, v_target_date);

  -- Calculate total spent
  SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
  FROM public.budget_transactions
  WHERE user_id = p_user_id 
    AND created_at >= v_boundaries.start_time 
    AND created_at < v_boundaries.end_time;

  -- Count transactions
  SELECT COUNT(*) INTO v_transactions_count
  FROM public.budget_transactions
  WHERE user_id = p_user_id 
    AND created_at >= v_boundaries.start_time 
    AND created_at < v_boundaries.end_time;

  -- Get sample transactions
  SELECT jsonb_agg(t) INTO v_sample_transactions
  FROM (
    SELECT 
      id,
      amount,
      transaction_type,
      category_id,
      created_at
    FROM public.budget_transactions
    WHERE user_id = p_user_id 
      AND created_at >= v_boundaries.start_time 
      AND created_at < v_boundaries.end_time
    ORDER BY created_at DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'debug_info', jsonb_build_object(
      'timestamp_utc', v_now,
      'user_timezone', v_timezone,
      'day_rollover_hour', v_rollover_hour,
      'current_time_in_user_tz', v_current_time_in_tz,
      'target_date', v_target_date
    ),
    'boundaries', jsonb_build_object(
      'start_time', v_boundaries.start_time,
      'end_time', v_boundaries.end_time
    ),
    'spent_amount', v_total_spent,
    'transaction_count', v_transactions_count,
    'sample_transactions', v_sample_transactions
  );
END;
$function$;