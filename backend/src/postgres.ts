import { Pool } from 'pg';
export interface Database {
 query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{rows:T[]}>;
 transaction<T>(work:(db:Database)=>Promise<T>):Promise<T>;
}
export function postgresDatabase(connectionString:string):Database & {close:()=>Promise<void>} {
 // TLS options belong in the connection string/PGSSLROOTCERT; never disable certificate verification.
 const pool=new Pool({connectionString,max:10,connectionTimeoutMillis:10000,statement_timeout:15000});
 const connection=(query:Database['query']):Database=>({query,transaction:async work=>work(connection(query))});
 return {
  close:()=>pool.end(),
  async query<T>(sql:string,values?:unknown[]){const result=await pool.query(sql,values);return {rows:result.rows as T[]}},
  async transaction(work){const client=await pool.connect();try{await client.query('begin');const db=connection(async<T>(sql:string,values?:unknown[])=>({rows:(await client.query(sql,values)).rows as T[]}));const result=await work(db);await client.query('commit');return result;}catch(e){await client.query('rollback');throw e}finally{client.release()}}
 };
}
export async function actor<T>(db:Database,userId:string,work:(db:Database)=>Promise<T>){return db.transaction(async tx=>{await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[userId]);return work(tx)});}
