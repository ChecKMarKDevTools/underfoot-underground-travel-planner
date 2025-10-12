import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 405,
    });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const requestData = await req.json();
    const { operation, table, data } = requestData;

    if (!operation || !table || !data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: operation, table, data',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    if (!['search_results', 'location_cache'].includes(table)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid table. Must be search_results or location_cache',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    let result;

    switch (operation) {
      case 'upsert':
        result = await supabaseAdmin.from(table).upsert(data).select();
        break;

      case 'delete':
        result = await supabaseAdmin.from(table).delete().match(data);
        break;

      case 'cleanup':
        result = await supabaseAdmin.rpc('clean_expired_cache');
        break;

      default:
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Invalid operation. Must be upsert, delete, or cleanup',
          }),
          {
            headers: { 'Content-Type': 'application/json' },
            status: 400,
          },
        );
    }

    if (result.error) throw result.error;

    return new Response(JSON.stringify({ success: true, data: result.data }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Edge function error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
