const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'uqvwaiexsgprdbdecoxx';
const ACCESS_TOKEN = 'sbp_dadedc8aeaa73d0f76b8d6f71a34e9d6bae98e3c';

async function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    
    const options = {
      hostname: 'api.supabase.com',
      port: 443,
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('🚀 Creating tables...\n');

  const sql = fs.readFileSync(path.join(__dirname, 'complete-migration.sql'), 'utf-8');
  
  try {
    const result = await executeSQL(sql);
    console.log('✅ SQL executed successfully');
    console.log('Result:', JSON.stringify(result, null, 2));
    
    // Verify tables exist
    console.log('\n🔍 Verifying tables...');
    const tables = await executeSQL(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log('Tables:', JSON.stringify(tables, null, 2));
    
    // Reload PostgREST schema
    console.log('\n🔄 Reloading PostgREST schema...');
    const https2 = require('https');
    const reloadReq = https2.request({
      hostname: 'uqvwaiexsgprdbdecoxx.supabase.co',
      path: '/rest/v1/',
      method: 'POST',
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdndhaWV4c2dwcmRiZGVjb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU1NDg2NywiZXhwIjoyMDcyMTMwODY3fQ.ge77JtO_vPUmXnQ8mz06w4VoryibGPyjfpiG4ejZieI',
        'Prefer': 'schema=reload'
      }
    }, (res) => {
      console.log('Schema reload status:', res.statusCode);
    });
    reloadReq.end();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

main();
