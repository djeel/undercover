-- Undercover authoritative social and game persistence.
-- Game state is intentionally server-only; clients receive member-filtered views from FastAPI.

create type public.game_phase as enum ('lobby', 'playing', 'voting', 'mr_white_guess', 'finished');
create type public.player_role as enum ('civilian', 'undercover', 'mr_white', 'jester', 'bodyguard');
create type public.winner_type as enum ('civilians', 'undercovers', 'mr_white', 'jester');
create type public.composition_mode as enum ('visible_manual', 'hidden_manual', 'hidden_random');
create type public.friendship_status as enum ('pending', 'accepted');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_handle_length check (char_length(handle) between 3 and 24),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 24)
);

create unique index profiles_handle_lower_key on public.profiles (lower(handle));

create table public.friendships (
  user_low uuid not null references auth.users(id) on delete cascade,
  user_high uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  constraint friendships_canonical_pair check (user_low < user_high),
  constraint friendships_requested_by_member check (requested_by in (user_low, user_high))
);

create index friendships_user_high_idx on public.friendships (user_high);
create index friendships_requested_by_idx on public.friendships (requested_by);

create table public.games (
  id uuid primary key,
  room_code char(6) not null unique,
  host_user_id uuid not null references auth.users(id) on delete restrict,
  phase public.game_phase not null default 'lobby',
  composition_mode public.composition_mode not null default 'visible_manual',
  language char(2) not null,
  state jsonb not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);

create table public.game_members (
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  player_id uuid not null,
  display_name text not null,
  avatar_url text,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  primary key (game_id, user_id),
  unique (game_id, player_id),
  constraint game_members_display_name_length check (char_length(display_name) between 1 and 24)
);

create index game_members_user_id_idx on public.game_members (user_id);
create index game_members_active_topic_idx on public.game_members (game_id, user_id) where left_at is null;

create table public.game_results (
  game_id uuid not null references public.games(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  role public.player_role not null,
  winner public.winner_type not null,
  won boolean not null,
  survived boolean not null,
  rounds_played integer not null check (rounds_played >= 0),
  duration_seconds integer not null check (duration_seconds >= 0),
  played_at timestamptz not null default now(),
  primary key (game_id, user_id)
);

create index game_results_user_played_idx on public.game_results (user_id, played_at desc);

create table public.player_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games_played integer not null default 0 check (games_played >= 0),
  games_won integer not null default 0 check (games_won >= 0),
  games_lost integer not null default 0 check (games_lost >= 0),
  current_win_streak integer not null default 0 check (current_win_streak >= 0),
  best_win_streak integer not null default 0 check (best_win_streak >= 0),
  constraint player_stats_outcomes_match check (games_played = games_won + games_lost)
);

create table public.player_role_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.player_role not null,
  games_played integer not null default 0 check (games_played >= 0),
  wins integer not null default 0 check (wins >= 0 and wins <= games_played),
  primary key (user_id, role)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger friendships_set_updated_at
before update on public.friendships
for each row execute function public.set_updated_at();

create trigger games_set_updated_at
before update on public.games
for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate text;
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  profile_name text;
begin
  profile_name := left(coalesce(
    nullif(trim(metadata ->> 'full_name'), ''),
    nullif(trim(metadata ->> 'name'), ''),
    nullif(trim(metadata ->> 'preferred_username'), ''),
    'Player'
  ), 24);

  loop
    candidate := 'user_' || substring(replace(gen_random_uuid()::text, '-', '') from 1 for 8);
    begin
      insert into public.profiles (id, handle, display_name, avatar_url)
      values (
        new.id,
        candidate,
        profile_name,
        coalesce(nullif(trim(metadata ->> 'avatar_url'), ''), nullif(trim(metadata ->> 'picture'), ''))
      );
      exit;
    exception when unique_violation then
      if exists (select 1 from public.profiles where id = new.id) then
        exit;
      end if;
    end;
  end loop;

  return new;
end;
$$;

create trigger auth_user_creates_profile
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

create or replace function public.enforce_friendship_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_low <> old.user_low
    or new.user_high <> old.user_high
    or new.requested_by <> old.requested_by
    or old.status <> 'pending'
    or new.status <> 'accepted' then
    raise exception 'friendship may only transition from pending to accepted';
  end if;
  return new;
end;
$$;

create trigger friendships_transition_only
before update on public.friendships
for each row execute function public.enforce_friendship_transition();

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.games enable row level security;
alter table public.game_members enable row level security;
alter table public.game_results enable row level security;
alter table public.player_stats enable row level security;
alter table public.player_role_stats enable row level security;

revoke all on table public.profiles, public.friendships, public.games, public.game_members,
  public.game_results, public.player_stats, public.player_role_stats from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.friendships to authenticated;
grant select on public.game_members, public.game_results, public.player_stats, public.player_role_stats to authenticated;

create policy "authenticated users read public profiles"
on public.profiles for select to authenticated
using (true);

create policy "users update their own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "friends read their relationships"
on public.friendships for select to authenticated
using ((select auth.uid()) in (user_low, user_high));

create policy "users request a friendship"
on public.friendships for insert to authenticated
with check (
  status = 'pending'
  and requested_by = (select auth.uid())
  and (select auth.uid()) in (user_low, user_high)
  and user_low <> user_high
);

create policy "recipients accept pending friendships"
on public.friendships for update to authenticated
using (
  status = 'pending'
  and requested_by <> (select auth.uid())
  and (select auth.uid()) in (user_low, user_high)
)
with check (
  status = 'accepted'
  and requested_by <> (select auth.uid())
  and (select auth.uid()) in (user_low, user_high)
);

create policy "friends remove their relationships"
on public.friendships for delete to authenticated
using ((select auth.uid()) in (user_low, user_high));

create policy "members read their membership snapshots"
on public.game_members for select to authenticated
using ((select auth.uid()) = user_id);

create policy "players read their results"
on public.game_results for select to authenticated
using ((select auth.uid()) = user_id);

create policy "players read their aggregate stats"
on public.player_stats for select to authenticated
using ((select auth.uid()) = user_id);

create policy "players read their role stats"
on public.player_role_stats for select to authenticated
using ((select auth.uid()) = user_id);

create policy "active game members receive broadcasts"
on realtime.messages for select to authenticated
using (
  realtime.messages.extension = 'broadcast'
  and exists (
    select 1
    from public.game_members member
    where (select realtime.topic()) = 'game:' || member.game_id::text
      and member.user_id = (select auth.uid())
      and member.left_at is null
  )
);
