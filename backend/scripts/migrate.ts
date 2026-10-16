import 'dotenv/config';
import { postgresDatabase } from '../src/postgres';
import { applyMigrations, migrationPreflight } from './migration-review';
async function main(){
 if(!process.env.DATABASE_URL)throw new Error('Configure DATABASE_URL in backend/.env.');
 const args=process.argv.slice(2);if(args.some(a=>!['--check','--apply'].includes(a))||args.length!==1)throw new Error('Use --check or --apply.');
 const db=postgresDatabase(process.env.DATABASE_URL);
 try{const result=args[0]==='--apply'?await applyMigrations(db,true):await db.transaction(async tx=>{await tx.query('set transaction read only');return migrationPreflight(tx)});console.log(JSON.stringify(result,null,2));}finally{await db.close()}
}
void main().catch(e=>{console.error((e instanceof Error?e.message:'Migration review failed').replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[database URL redacted]'));process.exitCode=1});
