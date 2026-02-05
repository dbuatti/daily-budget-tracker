import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-background">
      <Card className="w-full max-w-md rounded-3xl shadow-2xl border-indigo-200 dark:border-indigo-900/50">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-extrabold text-indigo-700 dark:text-indigo-300">
            Weekly Permissions
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to manage your tokens.</p>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={['google']}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(240 72% 50%)', // Primary Indigo
                    brandAccent: 'hsl(240 72% 60%)',
                    defaultButtonBackground: 'hsl(210 40% 96.1%)',
                    defaultButtonBackgroundHover: 'hsl(210 40% 91.1%)',
                    inputBackground: 'hsl(214.3 31.8% 91.4%)',
                  },
                  radii: {
                    borderRadiusButton: '0.75rem', // Rounded buttons
                    inputBorderRadius: '0.75rem',
                  }
                },
                dark: {
                  colors: {
                    brand: 'hsl(240 72% 60%)',
                    brandAccent: 'hsl(240 72% 70%)',
                    defaultButtonBackground: 'hsl(217.2 32.6% 17.5%)',
                    defaultButtonBackgroundHover: 'hsl(217.2 32.6% 25%)',
                    inputBackground: 'hsl(217.2 32.6% 17.5%)',
                  }
                }
              }
            }}
            theme="default"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;