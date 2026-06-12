const fs = require('fs');
const path = require('path');
const db = require('./db');

async function runMigration() {
  const client = await db.connect();
  try {
    console.log('📋 Migration 002 çalışdırılıyor...');
    
    const migrationPath = path.join(__dirname, 'migrations', '002_extend_posts_and_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Migration 002 uğurla tətbiq olundu!');
  } catch (error) {
    console.error('❌ Migration 002 xəta:', error.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

runMigration();
