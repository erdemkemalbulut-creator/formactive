const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !dbPassword) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_DB_PASSWORD');
    process.exit(1);
  }

  const projectRef = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  console.log('Project ref:', projectRef);
  
  const regions = ['eu-central-1', 'us-east-1', 'eu-west-1', 'us-west-1', 'ap-southeast-1', 'ap-northeast-1', 'us-east-2', 'us-west-2', 'eu-west-2', 'ap-south-1'];
  
  const connectionConfigs = [];
  
  for (const region of regions) {
    connectionConfigs.push({
      name: `Pooler ${region} port 6543 (session)`,
      connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    });
    connectionConfigs.push({
      name: `Pooler ${region} port 5432 (transaction)`,
      connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    });
  }

  connectionConfigs.push({
    name: 'Direct connection (standard)',
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`,
  });
  connectionConfigs.push({
    name: 'Direct connection (port 6543)',
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:6543/postgres`,
  });
  connectionConfigs.push({
    name: 'Direct via project host',
    connectionString: `postgresql://postgres:${encodeURIComponent(dbPassword)}@${projectRef}.supabase.co:5432/postgres`,
  });

  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260208200000_form_builder_v2_schema.sql'),
    'utf8'
  );

  for (const config of connectionConfigs) {
    const client = new Client({ 
      connectionString: config.connectionString, 
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    
    try {
      process.stdout.write(`Trying ${config.name}... `);
      await client.connect();
      console.log('CONNECTED!');
      
      console.log('Running migration...');
      await client.query(migrationSQL);
      console.log('Migration completed successfully!');

      const { rows } = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'forms' 
        ORDER BY ordinal_position
      `);
      console.log('Forms table columns:', rows.map(r => r.column_name).join(', '));
      
      await client.end();
      console.log('\nDone! Your database is ready.');
      process.exit(0);
    } catch (error) {
      await client.end().catch(() => {});
      const msg = error.message.substring(0, 60);
      if (!msg.includes('ENOTFOUND') && !msg.includes('Tenant or user not found')) {
        console.log(`FAILED: ${error.message}`);
      } else {
        console.log(`skip (${msg})`);
      }
    }
  }
  
  console.error('\n--- Could not connect ---');
  console.error('Please provide the full database connection string from:');
  console.error('Supabase Dashboard > Settings > Database > Connection string > URI');
  process.exit(1);
}

runMigration();
