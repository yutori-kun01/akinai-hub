import {releaseFile} from '@/lib/licenses';
import {auditStatement} from '@/lib/server';
import {workspace} from '@/lib/auth';
export async function GET(req:Request){const token=new URL(req.url).searchParams.get('token')||'';const found=token.length<500?await releaseFile(token):null;if(!found)return new Response('このダウンロードリンクは無効か期限切れです。更新確認をやり直してください。',{status:403,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});await auditStatement(workspace(),'release:download',found.release.id).run();return new Response(found.file.body,{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="akinai-hub-'+found.release.version.replace(/[^0-9A-Za-z.-]/g,'')+'.zip"','X-Release-Sha256':found.release.sha256,'Cache-Control':'no-store'}});}
