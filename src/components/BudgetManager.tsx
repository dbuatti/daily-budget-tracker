import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const TARGET_EMAIL = 'daniele.buatti@gmail.com';
const TARGET_AMOUNT = 300;

export function BudgetManager() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSetBudget = async () => {
    setStatus('loading');
    setMessage('');

    // The Edge Function URL is constructed using the project ID and function name.
    // The project ID is yfgapigmiyclgryqdgne and the function name is set-user-budget.
    const functionUrl = `https://yfgapigmiyclgryqdgne.supabase.co/functions/v1/set-user-budget`;

    try {
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: TARGET_EMAIL,
          amount: TARGET_AMOUNT,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message || `Successfully set budget for ${TARGET_EMAIL} to $${TARGET_AMOUNT}.`);
      } else {
        setStatus('error');
        setMessage(data.error || 'An unknown error occurred while setting the budget.');
      }
    } catch (error) {
      setStatus('error');
      setMessage(`Network error: ${error.message}`);
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-indigo-200/50">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-indigo-700">Budget Manager</CardTitle>
        <CardDescription className="text-gray-500">
          Use this tool to ensure a specific user's budget is set to a target amount.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-gray-700">Target Email</Label>
          <Input id="email" value={TARGET_EMAIL} readOnly className="bg-gray-50 border-gray-300" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Target Budget Amount</Label>
          <Input id="amount" value={`$${TARGET_AMOUNT}`} readOnly className="bg-gray-50 border-gray-300" />
        </div>
        
        <Button
          onClick={handleSetBudget}
          disabled={status === 'loading'}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition duration-150 ease-in-out shadow-md hover:shadow-lg"
        >
          {status === 'loading' ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting Budget...
            </span>
          ) : (
            `Set Budget to $${TARGET_AMOUNT}`
          )}
        </Button>

        {message && (
          <div className={`flex items-center p-3 rounded-lg ${status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {getStatusIcon()}
            <p className={`ml-3 text-sm font-medium ${status === 'success' ? 'text-green-700' : 'text-red-700'}`}>
              {message}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}