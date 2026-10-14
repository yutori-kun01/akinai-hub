import {defineConfig} from 'vite';
import vinext from 'vinext';
export default defineConfig(async()=>{process.env.CLOUDFLARE_CF_FETCH_ENABLED='false';const {cloudflare}=await import('@cloudflare/vite-plugin');return {plugins:[vinext(),cloudflare({configPath:'wrangler.standalone.json',viteEnvironment:{name:'rsc',childEnvironments:['ssr']},inspectorPort:false})]};});
