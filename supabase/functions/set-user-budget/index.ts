import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, amount } = await req.json();

    if (!email || typeof amount !== 'number') {
      return new Response(JSON.stringify({ error: "[set-user-budget] Missing email or amount" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a Supabase client with the Service Role Key to bypass RLS and access auth.users
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Find the user ID by email
    console.log(`[set-user-budget] Searching for user with email: ${email}`);
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (userError || !userData?.user) {
      console.error(`[set-user-budget] Error finding user: ${userError?.message || 'User not found'}`);
      return new Response(JSON.stringify({ error: `User not found for email: ${email}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    console.log(`[set-user-budget] Found user ID: ${userId}`);

    // 2. Update the weekly_budget_state for the user
    // We will use the 'gear_travel_fund' column to store the total budget amount.
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('weekly_budget_state')
      .upsert(
        {
          user_id: userId,
          gear_travel_fund: amount,
          last_reset_date: new Date().toISOString().split('T')[0], // Set to today
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (updateError) {
      console.error(`[set-user-budget] Error updating budget state: ${updateError.message}`);
      return new Response(JSON.stringify({ error: `Database update failed: ${updateError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[set-user-budget] Successfully set budget for user ${userId} to $${amount}`);

    return new Response(JSON.stringify({
      message: `Budget successfully set to $${amount} for user ${email}.`,
      budget_state: updateData,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`[set-user-budget] General error: ${error.message}`);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});