import * as fs from 'fs';
const env = Object.fromEntries(fs.readFileSync('.env','utf8').split('\n').filter(Boolean).map(line=> {
  const [key,...rest] = line.split('=');
  return [key.trim(), rest.join('=').trim()];
}));
const fetch = global.fetch;
const url = `https://${env.VITE_SUPABASE_URL.replace('https://','').replace('http://','')}/rest/v1/contacts?select=*,niche:niches(name)&user_id=in.()&order=created_at.desc`;
const res = await fetch(url, {
  headers: {
    apikey: env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.VITE_SUPABASE_SERVICE_ROLE_KEY}`,
    'Accept': 'application/json'
  }
});
console.log('status', res.status);
console.log('body', await res.text());
