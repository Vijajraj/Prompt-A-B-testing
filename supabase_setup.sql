-- Table: ab_logs (created in Phase 1)
create table ab_logs (
  id            uuid default gen_random_uuid() primary key,
  prompt_a      text not null,
  prompt_b      text not null,
  prompt_c      text not null,
  query         text not null,
  response_a    text,
  response_b    text,
  response_c    text,
  score_a       float,
  score_b       float,
  score_c       float,
  winner        text,
  final_output  text,
  created_at    timestamptz default now()
);

-- Table: training_data (added in Phase 2 for ML training)
create table training_data (
  id               uuid default gen_random_uuid() primary key,
  log_id           uuid references ab_logs(id),
  variant          text,
  word_count       int,
  sentence_count   int,
  avg_sent_length  float,
  has_bullets      int,
  readability      float,
  prompt_length    int,
  query_length     int,
  prompt_style     int,
  score            float,
  created_at       timestamptz default now()
);

-- Disable RLS on both tables after creating:
-- Table Editor → ab_logs → RLS → toggle off
-- Table Editor → training_data → RLS → toggle off
