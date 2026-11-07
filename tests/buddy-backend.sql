-- Run against a configured Supabase database. Everything is rolled back.
begin;
do $$
declare u uuid:=gen_random_uuid();ok integer:=0;v uuid;c uuid;
begin
 insert into auth.users(id,email) values(u,'buddy-test-'||u||'@example.invalid');
 perform public.thread_buddy_key(u,'openai','save',repeat('test',10));
 if public.thread_buddy_key(u,'openai','read')<>repeat('test',10) then raise exception 'Vault roundtrip failed';end if;
 select secret_id into v from thread_private.buddy_keys where user_id=u;
 for i in 1..21 loop if public.thread_buddy_take(u) then ok:=ok+1;end if;end loop;
 if ok<>20 then raise exception 'Free quota failed: %',ok;end if;
 insert into thread_private.access_codes(code_hash,label) values(encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex'),'Disposable test') returning id into c;
 insert into public.agent_premium_grants(user_id,code_id) values(u,c);
 if not public.thread_buddy_take(u) then raise exception 'Pro request above 20 was blocked';end if;
 perform public.thread_buddy_key(u,'openai','delete');
 if exists(select 1 from vault.secrets where id=v) then raise exception 'Secret deletion failed';end if;
 if has_function_privilege('authenticated','public.thread_buddy_key(uuid,text,text,text)','execute') then raise exception 'Client secret access';end if;
 if has_function_privilege('anon','public.thread_buddy_status(uuid)','execute') then raise exception 'Anonymous status access';end if;
end $$;
select 'PASS: Vault lifecycle, free/pro quotas, client isolation' as result;
rollback;
