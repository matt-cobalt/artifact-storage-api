import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  const startupGuide = {
    title: 'Daily Startup Guide - Agent System',
    version: 'v1.0',
    quick_commands: {
      start_server: 'cd artifact-storage-api && node src/artifact-storage/server.js',
      health_check: 'curl.exe http://localhost:3000/health',
      diagnostics: 'node src/scripts/diagnose-setup.js',
      test_otto:
        'curl.exe -X POST http://localhost:3000/api/agents/otto/execute -H "Content-Type: application/json" -d "{\\"customer_id\\":\\"test\\",\\"request\\":\\"hello\\"}"'
    },
    troubleshooting: {
      server_wont_start:
        'Kill port 3000: netstat -ano | findstr :3000, then taskkill /PID <number> /F',
      check_env: 'Verify .env has ANTHROPIC_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY'
    }
  };

  const artifactId = `daily_startup_guide:${Date.now()}:startup`;

  const { data, error } = await supabase
    .from('artifacts')
    .insert({
      artifact_id: artifactId,
      type: 'daily_startup_guide',
      data: startupGuide,
      source: 'claude_creation'
    })
    .select('artifact_id')
    .single();

  if (error) {
    console.error('Error saving startup guide artifact:', error);
    process.exit(1);
  }

  console.log('Saved artifact_id:', data.artifact_id);
}

main().catch(err => {
  console.error('Unexpected error saving startup guide artifact:', err);
  process.exit(1);
});









