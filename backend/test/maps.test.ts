import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {distanceKm,directions} from '../../shared/maps';
import {importRealVenues} from '../scripts/import-real-venues';
import type {Database} from '../src/postgres';
import {mapHtml} from '../../mobile/src/map-html';
import type {Venue} from '../../shared/contracts';
test('controlled native map escapes HTML/script payloads in records and selected IDs',()=>{
 const payload='</script><script>alert(1)</script>';
 const venue:Venue={id:'safe-id',name:payload,description:'',address:'Lahore',cityId:'lahore',areaId:null,latitude:31.52,longitude:74.35,phone:null,facilities:[],photos:[],source:'directory',verified:false,sports:[]};
 const html=mapHtml([venue],payload);assert.ok(!html.includes('const selected="'+payload));assert.ok(html.includes('\\u003c/script>'));assert.ok(html.includes('title.textContent=v.name'));assert.ok(html.includes('https://tile.openstreetmap.org/'));assert.ok(html.includes('OpenStreetMap'));
});
test('map distance/directions and directory manifest source/coordinate uniqueness',()=>{
 const a={latitude:31.52,longitude:74.35},b={latitude:31.53,longitude:74.35};assert.equal(distanceKm(a,a),0);assert.ok(Math.abs(distanceKm(a,b)-1.112)<.01);assert.equal(distanceKm(a,b),distanceKm(b,a));assert.equal(new URL(directions(a.latitude,a.longitude)).searchParams.get('destination'),'31.52,74.35');
 const rows=JSON.parse(readFileSync('data/lahore-real-venues.json','utf8')) as {sourceId:string;latitude:number;longitude:number;sources:string[]}[];assert.equal(rows.length,19);assert.equal(new Set(rows.map(v=>v.sourceId)).size,19);assert.equal(new Set(rows.map(v=>v.latitude+','+v.longitude)).size,19);assert.ok(rows.every(v=>v.sources.length>0&&v.latitude>31.2&&v.latitude<31.72&&v.longitude>74.05&&v.longitude<74.65));
});
test('directory importer rejects duplicate provenance or invalid Lahore coordinates before database writes',async()=>{
 const rows=JSON.parse(readFileSync('data/lahore-real-venues.json','utf8'));const db={query:async()=>{throw Error('Unexpected database access')},transaction:async()=>{throw Error('Unexpected database access')}} as Database;await assert.rejects(()=>importRealVenues(db,[...rows,rows[0]]),/Duplicate source/);rows[0].latitude=0;await assert.rejects(()=>importRealVenues(db,rows));
});

test('repeated directory import refuses changed ownership',async()=>{
 const rows=JSON.parse(readFileSync('data/lahore-real-venues.json','utf8'));
 const db:Database={query:async<T>(sql:string)=>({rows:(sql.includes('information_schema')?[{}]:sql.includes('directory_metadata metadata')?[{source:'directory',metadata:{sourceId:rows[0].sourceId},ownerId:'changed-owner'}]:[]) as T[]}),transaction:async work=>work(db)};
 await assert.rejects(()=>importRealVenues(db,rows),/Ownership changed/);
});
