import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldAlert } from 'lucide-react';

const RLSDebugPanel: React.FC = () => {
  const { user } = useSession();

  const checkRLSPolicies = async () => {
    if (!user) return;
    
    console.log('Checking RLS policies for budget_transactions...');
    
    // Try to insert a test record
    const testData = {
      user_id: user.id,
      amount: 0.01,
      category_id: 'TEST',
      transaction_type: 'token_spend' as const,
    };
    
    const { data, error } = await supabase
      .from('budget_transactions')
      .insert(testData)
      .select();
    
    console.log('Test insert result:', { data, error });
    
    if (error) {
      alert(`RLS Policy Error: ${error.message}`);
    } else {
      alert('Test insert successful! RLS is working.');
      // Clean up test data
      if (data && data[0]) {
        await supabase.from('budget_transactions').delete().eq('id', data[0].id);
      }
    }
  };

  if (!user) return null;

  return (
    <Card className="mt-6 rounded-2xl shadow-xl border-2 border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-orange-800 dark:text-orange-300 flex items-center">
          <ShieldAlert className="w-5 h-5 mr-2" /> RLS Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-orange-800 dark:text-orange-200 mb-4">
          Test if your RLS policies allow inserting into budget_transactions.
        </p>
        <Button 
          onClick={checkRLSPolicies}
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          Test Insert Permission
        </Button>
      </CardContent>
    </Card>
  );
};

export default RLSDebugPanel;