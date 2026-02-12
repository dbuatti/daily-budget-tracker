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

    console.log(`[set-user-budget] Searching for user with email: ${email}`);
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserByEmail(email);

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: `User not found for email: ${email}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = userData.user.id;
    
    // Update annual_income instead of gear_travel_fund
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('weekly_budget_state')
      .upsert(
        {
          user_id: userId,
          annual_income: amount,
          last_reset_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (updateError) {
      return new Response(JSON.stringify({ error: `Database update failed: ${updateError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      message: `Annual income successfully set to $${amount} for user ${email}.`,
      budget_state: updateData,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});