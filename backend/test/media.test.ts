import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaBytes} from '../src/media';
test('media rejects spoofed headers, oversized content and executable types',()=>{
 const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=';
 assert.ok(mediaBytes('image/png',png).length>40);
 assert.throws(()=>mediaBytes('image/png',Buffer.from([137,80,78,71,13,10,26,10]).toString('base64')),/valid JPEG/);
 assert.throws(()=>mediaBytes('image/svg+xml',Buffer.from('<svg/>').toString('base64')),/valid JPEG/);
 assert.throws(()=>mediaBytes('image/jpeg',Buffer.alloc(5242881).toString('base64')),/5 MB/);
 assert.throws(()=>mediaBytes('image/png','!!!'),/base64/);
 assert.throws(()=>mediaBytes('application/pdf',Buffer.from('%PDF-1.7').toString('base64')),/valid JPEG/);
 assert.equal(mediaBytes('application/pdf',Buffer.from('%PDF-1.7').toString('base64'),true).length,8);
});
