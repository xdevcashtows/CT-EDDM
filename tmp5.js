import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
const env = fs.readFileSync('.env','utf8').split('\n').filter(Boolean).reduce((acc,line)=>{const [key,...rest]=line.split('=');acc[key.trim()]=rest.join('=').trim();return acc;},{});
const supabase=createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_SERVICE_ROLE_KEY);
const {data,error}=await supabase
  .from('contacts')
  .select('id, user_id, business_name, stage')
  .order('created_at',{ascending:false});
console.log('contacts',data,error);
