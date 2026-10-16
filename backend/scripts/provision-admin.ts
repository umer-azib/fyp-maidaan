import 'dotenv/config';
import {postgresDatabase} from '../src/postgres';
import {provisionAdministrator} from '../src/admin-provision';
async function main(){
 const args=process.argv.slice(2),emailIndex=args.indexOf('--email');
 if(emailIndex<0||!args[emailIndex+1]||args.some((v,i)=>i!==emailIndex+1&&!['--email','--grant'].includes(v))||args.filter(x=>x==='--email').length!==1||args.filter(x=>x==='--grant').length>1)throw new Error('Usage: npm run admin:provision -- --email approved@example.com [--grant]. Omit --grant for a read-only eligibility check.');
 if(process.env.NODE_ENV!=='development')throw new Error('Requires NODE_ENV=development.');
 if(!process.env.DATABASE_URL)throw new Error('Configure private DATABASE_URL.');
 const db=postgresDatabase(process.env.DATABASE_URL);try{console.log(JSON.stringify(await provisionAdministrator(db,args[emailIndex+1],process.env.NODE_ENV,args.includes('--grant')),null,2))}finally{await db.close()}
}
void main().catch(e=>{console.error((e instanceof Error?e.message:'Provisioning failed').replace(/postgres(?:ql)?:\/\/[^\s]+/gi,'[database URL redacted]'));process.exitCode=1});
