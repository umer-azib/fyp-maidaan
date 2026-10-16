import { HttpError } from './data';
export function mediaBytes(mime:string,base64:string,document=false){
 if(base64.length>6990508)throw new HttpError(400,'INVALID_IMAGE','Choose a file under 5 MB.');
 const b=Buffer.from(base64,'base64');
 if(b.toString('base64')!==base64)throw new HttpError(400,'INVALID_IMAGE','Invalid base64 file.');
 if(!b.length||b.length>5242880)throw new HttpError(400,'INVALID_IMAGE','Choose a file between 1 byte and 5 MB.');
 const valid=mime==='application/pdf'?document&&b.toString('ascii',0,5)==='%PDF-':mime==='image/png'?b.length>=45&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&b.toString('ascii',12,16)==='IHDR'&&b.readUInt32BE(16)>0&&b.readUInt32BE(20)>0&&b.readUInt32BE(16)*b.readUInt32BE(20)<=25000000&&b.toString('ascii',b.length-8,b.length-4)==='IEND':mime==='image/jpeg'?b.length>4&&b[0]===255&&b[1]===216&&b[b.length-2]===255&&b[b.length-1]===217:mime==='image/webp'?b.length>=20&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'&&b.readUInt32LE(4)+8===b.length:false;
 if(!valid)throw new HttpError(400,'INVALID_IMAGE','Choose a valid JPEG, PNG or WebP image (PDF only for ownership documents).');return b;
}
