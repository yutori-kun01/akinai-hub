import {db,cfg} from './server';
import {workspace,standalone} from './auth';
import {runAutomation} from './automation';
import {createBackup} from './backup';
import {checkForUpdates} from './licenses';
export async function scheduledRun(){if(!standalone()||!cfg().PUBLIC_ORIGIN)return;const owner=workspace();const now=Date.now();
 const claim=await db().prepare("INSERT INTO system_state(id,data,updated) VALUES('cron-lock','',?) ON CONFLICT(id) DO UPDATE SET updated=excluded.updated WHERE system_state.updated<? RETURNING id").bind(now,now-10*60000).first();if(!claim)return;
 try{
  await db().prepare("UPDATE jobs SET status='failed',error='処理が中断されました。配信サービスの履歴を確認してください' WHERE status='sending' AND started<?").bind(now-30*60000).run();
  for(const t of ['auth_sessions','auth_codes','auth_limits'])await db().prepare('DELETE FROM '+t+' WHERE expires<?').bind(now).run();await db().prepare("DELETE FROM system_state WHERE id LIKE 'oidc-code:%' AND updated<?").bind(now).run();
  const result=await runAutomation(owner,cfg().PUBLIC_ORIGIN);
  await db().prepare("INSERT OR REPLACE INTO system_state(id,data,updated) VALUES('cron',?,?)").bind(JSON.stringify({ok:true,...result}),now).run();
  if(cfg().LICENSE_KEY&&cfg().LICENSE_SERVER){const last=await db().prepare("SELECT updated FROM system_state WHERE id='license-status'").first<{updated:number}>();if(!last||last.updated<now-86400000)await checkForUpdates();}
  if(cfg().AUTO_BACKUP_ENABLED==='true'){const last=await db().prepare("SELECT updated FROM system_state WHERE id='backup'").first<{updated:number}>();if(!last||last.updated<now-86400000){const b=await createBackup(owner);await db().prepare("INSERT OR REPLACE INTO system_state(id,data,updated) VALUES('backup',?,?)").bind(JSON.stringify({key:b.key}),now).run();}}
 }catch(e){await db().prepare("INSERT OR REPLACE INTO system_state(id,data,updated) VALUES('cron',?,?)").bind(JSON.stringify({ok:false,error:e instanceof Error?e.message:'自動処理エラー'}),now).run();throw e;}finally{await db().prepare("DELETE FROM system_state WHERE id='cron-lock' AND updated=?").bind(now).run();}}
