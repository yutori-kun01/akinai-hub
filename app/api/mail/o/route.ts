import {readOpen,recordMailEvent} from '@/lib/tracking';
const gif=Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),c=>c.charCodeAt(0));
// Always answers with the pixel so a bad or replayed token reveals nothing; only valid tokens are counted.
export async function GET(req:Request){try{const id=await readOpen(new URL(req.url).searchParams);if(id)await recordMailEvent(id,'open');}catch{}return new Response(gif,{headers:{'Content-Type':'image/gif','Cache-Control':'no-store, private','Content-Length':String(gif.length)}});}
