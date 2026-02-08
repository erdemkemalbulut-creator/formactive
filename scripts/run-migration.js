const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const connString = process.env.SUPABASE_DB_URL;

  if (!connString) {
    console.error('Missing SUPABASE_DB_URL');
    process.exit(1);
  }

  const migrationSQL = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '20260208200000_form_builder_v2_schema.sql'),
    'utf8'
  );

  const url = new URL(connString);
  const password = url.password;
  const projectRef = url.hostname.replace('db.', '').replace('.supabase.co', '');
  
  console.log('Project ref:', projectRef);
  console.log('Original host:', url.hostname);

  const configs = [];
  
  configs.push({ name: 'Original URL as-is', connectionString: connString });

  const regions = ['eu-central-1', 'us-east-1', 'eu-west-1', 'us-west-1', 'ap-southeast-1', 'ap-northeast-1', 'us-east-2', 'us-west-2', 'eu-west-2', 'ap-south-1', 'sa-east-1', 'ca-central-1', 'eu-north-1'];
  
  for (const region of regions) {
    configs.push({
      name: `Pooler ${region} :6543`,
      connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    });
    configs.push({
      name: `Pooler ${region} :5432`,
      connectionString: `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-${region}.pooler.supabase.com:5432/postgres`,
    });
  }

  for (const config of configs) {
    const client = new Client({ 
      connectionString: config.connectionString, 
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    
    try {
      process.stdout.write(`${config.name}... `);
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
      console.log('\nDone! Database is ready.');
      process.exit(0);
    } catch (error) {
      await client.end().catch(() => {});
      const msg = error.message.substring(0, 80);
      if (msg.includes('ENOTFOUND') || msg.includes('Tenant or user not found') || msg.includes('timeout')) {
        console.log('skip');
      } else {
        console.log(`FAILED: ${msg}`);
      }
    }
  }
  
  console.error('\nCould not connect with any method.');
  console.error('Please make sure you copied the "Session mode" pooler connection string from:');
  console.error('Supabase Dashboard > Settings > Database > Connection string > select "Session pooler" or "Transaction pooler"');
  process.exit(1);
}

runMigration();
