import { attachDatabasePool } from '@vercel/functions';
import { isVercel, isProduction } from './runtime';
import { Pool } from 'pg';
export interface Database {
 query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{rows:T[]}>;
 transaction<T>(work:(db:Database)=>Promise<T>):Promise<T>;
}
export function postgresDatabase(connectionString:string):Database & {close:()=>Promise<void>} {
 // Production requires verified TLS; provider certificates can be configured in the connection string.
 if(isProduction()){
  const options=new URL(connectionString).searchParams;
  if(options.has('uselibpqcompat')||options.has('ssl')||(options.has('sslmode')&&options.get('sslmode')!=='verify-full'))throw new Error('Production DATABASE_URL requires verified TLS: use sslmode=verify-full or omit SSL query options.');
 }
 const pool=new Pool({connectionString,ssl:isProduction()?{rejectUnauthorized:true}:undefined,max:isVercel()?3:10,idleTimeoutMillis:5000,connectionTimeoutMillis:10000,statement_timeout:15000,allowExitOnIdle:true});
 if(isVercel())attachDatabasePool(pool);
 pool.on('error',()=>console.error('Idle PostgreSQL connection failed.'));
 const connection=(query:Database['query']):Database=>({query,transaction:async work=>work(connection(query))});
 return {
  close:()=>pool.end(),
  async query<T>(sql:string,values?:unknown[]){const result=await pool.query(sql,values);return {rows:result.rows as T[]}},
  async transaction(work){const client=await pool.connect();try{await client.query('begin');const db=connection(async<T>(sql:string,values?:unknown[])=>({rows:(await client.query(sql,values)).rows as T[]}));const result=await work(db);await client.query('commit');return result;}catch(e){await client.query('rollback');throw e}finally{client.release()}}
 };
}
export async function actor<T>(db:Database,userId:string,work:(db:Database)=>Promise<T>){return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[userId]);return work(tx)});}
