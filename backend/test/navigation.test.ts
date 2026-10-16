import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('all requested workspace destinations have unique routes without cross-portal links',async()=>{
 const {navigation}=await import('../../web/src/navigation.js');
 assert.deepEqual(navigation.player.map(x=>x[1]),['Overview','Find Venues','Find Open Games','AI Assistant','Map','My Bookings','My Games','Find Players','Connections','Messages','Reviews','My Profile','Settings']);
 assert.ok(!navigation.hub.some(x=>String(x[0])==='ai'));assert.ok(!navigation.admin.some(x=>String(x[0])==='ai'));
 assert.equal(navigation.hub.length,11);assert.equal(navigation.admin.length,14);
 for(const links of Object.values(navigation)){assert.equal(new Set(links.map(x=>x[0])).size,links.length);assert.ok(links.every(x=>!x[0].includes('/')));}
 const app=readFileSync('../web/src/App.tsx','utf8');assert.ok(!app.includes('Explore workspaces'));assert.ok(app.includes('navigation[area].filter'));
 for(const [path] of navigation.player)if(path)assert.ok(app.includes('path="'+path+'"'),path+' is missing');
});
