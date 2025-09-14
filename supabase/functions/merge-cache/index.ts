/// <reference types="https://deno.land/x/types/index.d.ts" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req: Request): Promise<Response> => {
  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const requestData = await req.json();

    // Perform operations on search_cache table with admin privileges
    const { data, error } = await supabaseAdmin
      .from('search_cache')
      .upsert(requestData) // adjust this based on your actual operation
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
