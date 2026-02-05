import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatCurrency } from '@/lib/format';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const formSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than zero.").max(1000, "Amount cannot exceed $1000."),
});

type AddTokenFormValues = z.infer<typeof formSchema>;

interface AddTokenDialogProps {
  categoryId: string;
  categoryName: string;
  onAddToken: (categoryId: string, amount: number) => void;
}

const AddTokenDialog: React.FC<AddTokenDialogProps> = ({ categoryId, categoryName, onAddToken }) => {
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<AddTokenFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0.00,
    },
  });

  const onSubmit = (values: AddTokenFormValues) => {
    onAddToken(categoryId, values.amount);
    form.reset();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="rounded-xl border-2 border-dashed border-indigo-400 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-600 dark:text-indigo-400 dark:hover:bg-gray-800 transition-colors"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Custom Spend
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
            Log Custom Spend
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Add an unbudgeted expense to the <span className="font-semibold text-indigo-600 dark:text-indigo-400">{categoryName}</span> category. This may result in a deficit.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (AUD)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-7 h-12 rounded-xl text-lg font-medium"
                        {...field}
                        onChange={(e) => {
                          // Convert input value to a number for the form state
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                        value={field.value === 0 ? '' : field.value}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold shadow-lg"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              Log {form.watch('amount') > 0 ? formatCurrency(form.watch('amount')).replace('A$', '$') : 'Spend'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTokenDialog;