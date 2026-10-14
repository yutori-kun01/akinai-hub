import {inflateRawSync} from 'node:zlib';
import {normalize,isAbsolute} from 'node:path';
// Minimal ZIP reader for the archives scripts/release/package.mjs writes (stored or deflate, UTF-8 names, prefix akinai-hub/).
export function unzip(buf){const files=new Map();let end=buf.length-22;while(end>=0&&buf.readUInt32LE(end)!==0x06054b50)end--;if(end<0)throw Error('ZIPを読み取れません');const count=buf.readUInt16LE(end+10);let p=buf.readUInt32LE(end+16);
 for(let i=0;i<count;i++){if(buf.readUInt32LE(p)!==0x02014b50)throw Error('ZIPが壊れています');const method=buf.readUInt16LE(p+10),csize=buf.readUInt32LE(p+20),nlen=buf.readUInt16LE(p+28),xlen=buf.readUInt16LE(p+30),clen=buf.readUInt16LE(p+32),off=buf.readUInt32LE(p+42);const name=buf.subarray(p+46,p+46+nlen).toString('utf8');p+=46+nlen+xlen+clen;if(name.endsWith('/'))continue;
  const lh=off+30+buf.readUInt16LE(off+26)+buf.readUInt16LE(off+28);const raw=buf.subarray(lh,lh+csize);const data=method===0?raw:method===8?inflateRawSync(raw):null;if(!data)throw Error('未対応の圧縮形式です: '+name);
  const rel=name.replace(/^akinai-hub\//,'');const clean=normalize(rel);if(!rel||isAbsolute(clean)||clean.startsWith('..')||clean!==rel)throw Error('不正なパスを含むため中止しました: '+name);files.set(rel,data);}
 return files;}
