import {readFile,writeFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
const cli=createInterface({input:stdin,output:stdout});
try{
 const existing=await readFile('wrangler.standalone.json','utf8').catch(()=>null);if(existing)throw Error('wrangler.standalone.json は既にあります。上書きせず直接編集してください。');
 const config=JSON.parse(await readFile('wrangler.standalone.example.json','utf8'));
 const name=(await cli.question('Worker名（英小文字・数字・ハイフン）: ')).trim();if(!/^[a-z][a-z0-9-]{2,50}$/.test(name))throw Error('Worker名が不正です');
 const email=(await cli.question('管理者メールアドレス: ')).trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('メールアドレスが不正です');
 const origin=(await cli.question('公開URL（https://...workers.dev または独自ドメイン）: ')).trim();const url=new URL(origin);if(url.protocol!=='https:'||url.pathname!=='/'||url.search||url.hash||url.username)throw Error('HTTPSのオリジンのみを入力してください');
 const database=(await cli.question('作成済みD1のdatabase_id: ')).trim();if(!/^[a-f0-9-]{36}$/.test(database)||database.startsWith('00000000'))throw Error('D1 IDが不正です');
 const bucket=(await cli.question('作成済みR2バケット名: ')).trim();if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))throw Error('バケット名が不正です');
 config.name=name;config.vars.ADMIN_EMAIL=email;config.vars.PUBLIC_ORIGIN=url.origin;config.d1_databases[0].database_name=name;config.d1_databases[0].database_id=database;config.r2_buckets[0].bucket_name=bucket;
 await writeFile('wrangler.standalone.json',JSON.stringify(config,null,2)+'\n',{flag:'wx'});
 console.log('設定を保存しました。docs/INSTALL.md に従ってシークレット・DB移行・ビルド・デプロイを進めてください。課金・配信は無効のままです。');
}finally{cli.close();}
