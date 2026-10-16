import 'dotenv/config';
import { postgresDatabase } from '../src/postgres';
import { requireDevelopment } from './dev-fixtures';
import { seedLahore } from './seed-lahore';
import { cleanupLahore } from './cleanup-lahore';
import { verifyLahore } from './verify-lahore';
async function main(){
 const policy={environment:process.env.NODE_ENV,enabled:process.env.MAIDAAN_ENABLE_DEV_SEED};requireDevelopment(policy);
 if(!process.env.DATABASE_URL)throw new Error('Configure server-only DATABASE_URL in backend/.env.');
 const mode=process.argv[2]||'seed';if(!['seed','verify','cleanup'].includes(mode))throw new Error('Use seed, verify or cleanup.');
 const db=postgresDatabase(process.env.DATABASE_URL);
 try{const result=mode==='seed'?await seedLahore(db,policy):mode==='cleanup'?await cleanupLahore(db,policy):await db.transaction(async tx=>{await tx.query('set transaction read only');return verifyLahore(tx)});console.log(JSON.stringify(result,null,2));}finally{await db.close()}
}
void main().catch(e=>{const safe=e instanceof Error?e.message:'Development fixture operation failed.';console.error(safe.replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[database URL redacted]'));process.exitCode=1});
