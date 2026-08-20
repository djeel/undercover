-- Allow authenticated active game members to send Broadcast messages to their own private game topic.
-- This mirrors the existing receive policy; Realtime evaluates it at channel join time.
create policy "active game members send broadcasts"
on realtime.messages for insert to authenticated
with check (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1
    from public.game_members member
    where (select realtime.topic()) = 'game:' || member.game_id::text
      and member.user_id = (select auth.uid())
      and member.left_at is null
  )
);
