import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('directory migration preserves managed records, rejects false ownership verification and duplicate provenance',async()=>{
 const pg=new PGlite();try{
  await pg.exec("create table public.venues(id integer primary key,source text not null check(source in ('onboarded','places')),verified boolean not null default false,check(not verified or source='onboarded'));insert into public.venues values(1,'onboarded',true);");
  await pg.exec(readFileSync('../supabase/migrations/202610150011_venue_directory.sql','utf8'));
  assert.deepEqual((await pg.query('select id,source,verified from public.venues where id=1')).rows,[{id:1,source:'onboarded',verified:true}]);
  await pg.exec(`insert into public.venues(id,source,directory_metadata) values(2,'directory','{"sourceId":"osm:way:123"}');`);
  await assert.rejects(()=>pg.exec(`insert into public.venues(id,source,directory_metadata) values(3,'directory','{"sourceId":"osm:way:123"}');`));
  await assert.rejects(()=>pg.exec(`insert into public.venues(id,source,verified) values(4,'directory',true);`));
  await assert.rejects(()=>pg.exec(`insert into public.venues(id,source,directory_metadata) values(5,'onboarded','{}');`));
 }finally{await pg.close()}
});
