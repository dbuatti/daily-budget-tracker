import React from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, toZonedTime } from 'date-fns-tz';
import { startOfDay, addHours } from 'date-fns';
import { Loader2, Clock, Calendar, Globe } from 'lucide-react';

const TimeDebugInfo: React.FC = () => {
  const { profile, isLoading, isError } = useUserProfile();
  const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();

  if (isLoading) {
    return <Loader2 className="h-6 w-6 animate-spin text-gray-500" />;
  }

  if (isError || !profile) {
    return <p className="text-red-500">Error loading profile time settings.</p>;
  }

  const { timezone: userTimezone, day_rollover_hour: rolloverHour } = profile;

  // 1. Client Time (Formatted in local timezone)
  const clientTime = format(now, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: clientTimezone });

  // 2. Supabase Time (UTC) - Use ISO string for reliable UTC representation
  const supabaseTime = now.toISOString(); 

  // 3. User's Daily Rollover Start Time
  // Get the start of the day in the user's timezone
  const startOfUserDay = startOfDay(toZonedTime(now, userTimezone));
  // Add the rollover hour
  const rolloverStart = addHours(startOfUserDay, rolloverHour);
  
  // If the current time is before the rollover hour, the "day" started yesterday.
  // We need to check if the current time in the user's timezone is before the rollover time today.
  const nowInUserTZ = toZonedTime(now, userTimezone);
  let effectiveRolloverStart = rolloverStart;
  
  // If the current time is before the rollover time, the budget day started yesterday.
  if (nowInUserTZ < rolloverStart) {
      effectiveRolloverStart = addHours(rolloverStart, -24);
  }
  
  const rolloverStartTimeFormatted = format(effectiveRolloverStart, 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: userTimezone });
  const rolloverEndTimeFormatted = format(addHours(effectiveRolloverStart, 24), 'yyyy-MM-dd HH:mm:ss zzz', { timeZone: userTimezone });


  return (
    <Card className="mt-6 mb-8 rounded-2xl shadow-xl border-2 border-yellow-300 dark:border-yellow-700 bg-yellow-50/50 dark:bg-yellow-900/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-yellow-800 dark:text-yellow-300 flex items-center">
          <Clock className="w-5 h-5 mr-2" /> Time Debug Information
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
        <div className="flex items-center">
          <Globe className="w-4 h-4 mr-2 text-yellow-600" />
          <p>
            <span className="font-semibold">Client Time:</span> {clientTime}
          </p>
        </div>
        <div className="flex items-center">
          <Globe className="w-4 h-4 mr-2 text-yellow-600" />
          <p>
            <span className="font-semibold">Supabase Time (UTC - DB Time):</span> {supabaseTime}
          </p>
        </div>
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-yellow-600" />
          <p>
            <span className="font-semibold">User Timezone:</span> {userTimezone} (Rollover: {rolloverHour}:00)
          </p>
        </div>
        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                Current Budget Day Start (in User TZ):
            </p>
            <p className="text-xs break-words">
                {rolloverStartTimeFormatted}
            </p>
            <p className="font-semibold text-yellow-800 dark:text-yellow-300 mt-1">
                Current Budget Day End (in User TZ):
            </p>
            <p className="text-xs break-words">
                {rolloverEndTimeFormatted}
            </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimeDebugInfo;