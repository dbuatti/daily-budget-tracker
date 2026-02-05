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

-- Policies for weekly_budget_state
CREATE POLICY "Users can view their own budget state" ON public.weekly_budget_state
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own budget state" ON public.weekly_budget_state
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own budget state" ON public.weekly_budget_state
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Trigger to automatically update 'updated_at' column on weekly_budget_state
CREATE TRIGGER on_weekly_budget_state_updated
  BEFORE UPDATE ON public.weekly_budget_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- --- Profile Setup for Auth ---

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  daily_streak INTEGER NOT NULL DEFAULT 0,
  last_streak_update TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  energy INTEGER NOT NULL DEFAULT 100,
  last_daily_reward_claim TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  last_daily_reward_notification TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  last_low_energy_notification TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  tasks_completed_today INTEGER NOT NULL DEFAULT 0,
  enable_daily_challenge_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  enable_low_energy_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  daily_challenge_target INTEGER NOT NULL DEFAULT 3,
  default_auto_schedule_start_time TEXT DEFAULT '09:00'::TEXT,
  default_auto_schedule_end_time TEXT DEFAULT '17:00'::TEXT,
  enable_delete_hotkeys BOOLEAN DEFAULT TRUE,
  enable_aethersink_backup BOOLEAN NOT NULL DEFAULT TRUE,
  last_energy_regen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_in_regen_pod BOOLEAN NOT NULL DEFAULT FALSE,
  regen_pod_start_time TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  journey_start_date DATE DEFAULT NULL,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  timezone TEXT DEFAULT 'UTC'::TEXT,
  neurodivergent_mode BOOLEAN DEFAULT FALSE,
  num_initial_habits INTEGER DEFAULT 0,
  initial_habit_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  initial_low_pressure_start BOOLEAN DEFAULT FALSE,
  initial_session_duration_preference TEXT DEFAULT 'medium'::TEXT,
  initial_allow_chunks BOOLEAN DEFAULT TRUE,
  initial_weekly_frequency INTEGER DEFAULT 4,
  enable_sound BOOLEAN DEFAULT TRUE,
  enable_haptics BOOLEAN DEFAULT TRUE,
  enable_temporal_gaps BOOLEAN DEFAULT TRUE,
  day_rollover_hour INTEGER DEFAULT 0,
  custom_habit_order TEXT[] DEFAULT NULL,
  section_order TEXT[] DEFAULT ARRAY['anchor'::TEXT, 'weekly_objective'::TEXT, 'daily_momentum'::TEXT],
  breakfast_time TEXT DEFAULT NULL,
  lunch_time TEXT DEFAULT NULL,
  dinner_time TEXT DEFAULT NULL,
  breakfast_duration_minutes INTEGER DEFAULT 30,
  lunch_duration_minutes INTEGER DEFAULT 45,
  dinner_duration_minutes INTEGER DEFAULT 60,
  custom_environment_order TEXT[] DEFAULT ARRAY['home'::TEXT, 'laptop'::TEXT, 'away'::TEXT, 'piano'::TEXT, 'laptop_piano'::TEXT],
  reflection_count INTEGER DEFAULT 1,
  reflection_times TEXT[] DEFAULT ARRAY['12:00'::TEXT],
  reflection_durations INTEGER[] DEFAULT ARRAY[15],
  enable_environment_chunking BOOLEAN DEFAULT TRUE,
  enable_macro_spread BOOLEAN DEFAULT FALSE,
  week_starts_on INTEGER DEFAULT 0,
  num_days_visible INTEGER DEFAULT 7,
  vertical_zoom_index INTEGER DEFAULT 3,
  is_dashboard_collapsed BOOLEAN DEFAULT FALSE,
  is_action_center_collapsed BOOLEAN DEFAULT FALSE,
  blocked_days TEXT[] DEFAULT ARRAY[]::TEXT[],
  skipped_day_off_suggestions TEXT[] DEFAULT ARRAY[]::TEXT[]
);

-- Enable RLS (REQUIRED for security)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create secure policies for each operation
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_delete_policy" ON public.profiles
FOR DELETE TO authenticated USING (auth.uid() = id);

-- Trigger to automatically update 'updated_at' column on profiles
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Function to insert profile when user signs up (from context)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER SET search_path = ''
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
    custom_environment_order -- Set to empty array
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
    ARRAY[]::TEXT[] -- Initialize as empty array
  );

  RETURN new;
END;
$function$;

-- Trigger the function on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();