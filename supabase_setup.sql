create table ab_logs (
  id           uuid default gen_random_uuid() primary key,
  prompt_a     text not null,
  prompt_b     text not null,
  prompt_c     text not null,
  query        text not null,
  response_a   text,
  response_b   text,
  response_c   text,
  score_a      float,
  score_b      float,
  score_c      float,
  winner       text,
  final_output text,
  created_at   timestamptz default now()
);
