-- User credentials are accessible ONLY to the Edge Function's service role.
-- No SELECT/INSERT/UPDATE/DELETE policies are granted to browser users.
create table if not exists public.user_ai_credentials (
 user_id uuid primary key references auth.users(id) on delete cascade,
 ciphertext text not null,
 iv text not null,
 model text not null default 'gemini-2.5-flash',
 updated_at timestamptz not null default now()
);
alter table public.user_ai_credentials enable row level security;
revoke all on public.user_ai_credentials from anon, authenticated;
grant all on public.user_ai_credentials to service_role;

create table if not exists public.ai_rate_windows (
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check (kind in ('ai', 'key')),
 window_start timestamptz not null,
 request_count integer not null default 1,
 primary key(user_id,kind,window_start)
);
alter table public.ai_rate_windows enable row level security;
revoke all on public.ai_rate_windows from anon,authenticated;
grant all on public.ai_rate_windows to service_role;

create or replace function public.consume_ai_rate(p_user uuid,p_kind text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare requests integer; current_window timestamptz := date_trunc('minute', now());
begin
 if p_kind not in ('ai','key') then raise exception 'Invalid rate-limit kind'; end if;
 delete from public.ai_rate_windows where window_start < now() - interval '1 hour';
 insert into public.ai_rate_windows(user_id,kind,window_start,request_count)
 values(p_user,p_kind,current_window,1)
 on conflict(user_id,kind,window_start) do update
 set request_count=public.ai_rate_windows.request_count+1
 returning request_count into requests;
 return requests <= case when p_kind='key' then 5 else 10 end;
end;
$$;
revoke all on function public.consume_ai_rate(uuid,text) from public,anon,authenticated;
grant execute on function public.consume_ai_rate(uuid,text) to service_role;
