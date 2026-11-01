import { waToken } from "../_shared/waConfig.ts";
const G = "https://graph.facebook.com/v25.0";
Deno.serve(async () => {
  const t = (Deno.env.get("META_ACCESS_TOKEN")||"").trim() || (Deno.env.get("META_SOCIAL_ACCESS_TOKEN")||"").trim() || waToken();
  const acc = await (await fetch(`${G}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${t}`)).json();
  const want = (Deno.env.get("META_FB_PAGE_ID")||"").trim();
  const p = (acc.data||[]).find((x:any)=>x.id===want) ?? acc.data?.[0];
  if (!p) return Response.json({ err: acc.error?.message });
  const fb = await (await fetch(`${G}/${p.id}/posts?fields=created_time,message&limit=8&access_token=${p.access_token}`)).json();
  const ig = p.instagram_business_account?.id ? await (await fetch(`${G}/${p.instagram_business_account.id}/media?fields=timestamp,caption&limit=8&access_token=${p.access_token}`)).json() : null;
  const s = (a:any[]|undefined,k:string,c:string)=> (a||[]).map((x:any)=>[x[k], (x[c]||"").slice(0,50)]);
  return Response.json({ page: p.name, fb: s(fb.data,"created_time","message"), fbErr: fb.error?.message, ig: s(ig?.data,"timestamp","caption"), igErr: ig?.error?.message });
});
