#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://uqvwaiexsgprdbdecoxx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxdndhaWV4c2dwcmRiZGVjb3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU1NDg2NywiZXhwIjoyMDcyMTMwODY3fQ.ge77JtO_vPUmXnQ8mz06w4VoryibGPyjfpiG4ejZieI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployMigrations() {
  console.log('🚀 Deploying Supabase migrations...\n');

  const migrationSql = fs.readFileSync(
    path.join(__dirname, 'complete-migration.sql'),
    'utf-8'
  );

  const statements = migrationSql
    .split('-- =============================================================================')
    .filter(s => s.trim().length > 0);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i].trim();
    if (!statement || statement.startsWith('--')) continue;

    console.log(`Executing step ${i + 1}/${statements.length}...`);
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error in step ${i + 1}:`, error.message);
        process.exit(1);
      }
      
      console.log(`✅ Step ${i + 1} complete`);
    } catch (err) {
      console.error(`❌ Failed step ${i + 1}:`, err.message);
    }
  }

  console.log('\n✅ Migration deployment complete!');
  console.log('\nNext: Run `bash test-security.sh` to verify');
}

deployMigrations().catch(console.error);
