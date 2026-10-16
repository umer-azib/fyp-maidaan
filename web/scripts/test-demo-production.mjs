import { build } from 'vite';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(root,'node_modules/.cache/demo-production-check');
assert(output.startsWith(path.join(root,'node_modules','.cache')+path.sep));
const original=process.env.NODE_ENV;
process.env.NODE_ENV='production';
try {
  await build({root,configFile:false,logLevel:'error',mode:'production',define:{'import.meta.env.VITE_ENABLE_DEMO_AUTH':'"true"'},
    build:{ssr:'src/services.ts',outDir:output,emptyOutDir:true,rollupOptions:{output:{entryFileNames:'services.mjs'}}}});
  const {demoAuth}=await import(pathToFileURL(path.join(output,'services.mjs')).href);
  assert.equal(demoAuth.enabled,false,'Production must ignore an explicit true demo flag');
  await demoAuth.restore();assert.equal(demoAuth.getSnapshot().session,null);
  await assert.rejects(()=>demoAuth.login('admin','admin','admin'),/disabled/);
  console.log('PASS: compiled production service disables demo login even with the flag true.');
} finally {
  if(original===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=original;
  await rm(output,{recursive:true,force:true});
}
