-- Update handle_new_user trigger to set timezone to UTC by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    last_active_at,
    xp,
    level,
    daily_streak,
    energy,
    tasks_completed_today,
    default_auto_schedule_start_time,
    default_auto_schedule_end_time,
    enable_aethersink_backup,
    journey_start_date,
    num_initial_habits,
    initial_habit_categories,
    initial_low_pressure_start,
    initial_session_duration_preference,
    initial_allow_chunks,
    initial_weekly_frequency,
    day_rollover_hour,
    breakfast_duration_minutes,
    lunch_duration_minutes,
    dinner_duration_minutes,
    reflection_count,
    reflection_times,
    reflection_durations,
    enable_environment_chunking,
    enable_macro_spread,
    custom_environment_order,
    timezone
  )
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    NOW(),
    0, 1, 0, 100, 0, '09:00', '17:00', TRUE, NOW()::date,
    0,
    ARRAY[]::TEXT[],
    FALSE,
    'medium',
    TRUE,
    4,
    0,
    30,
    45,
    60,
    1,
    ARRAY['12:00'],
    ARRAY[15],
    TRUE,
    FALSE,
    ARRAY[]::TEXT[],
    'UTC' -- Default timezone
  );

  RETURN new;
END;
$function$;

-- Update existing profiles with NULL timezone to UTC
UPDATE public.profiles
SET timezone = 'UTC'
WHERE timezone IS NULL;