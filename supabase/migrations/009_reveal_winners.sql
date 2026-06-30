-- Admin-controlled winner reveal after a poll closes.

alter table public.polls
  add column if not exists results_revealed boolean not null default false;

comment on column public.polls.results_revealed is
  'When true and the poll is closed, public results show winners and vote counts.';
