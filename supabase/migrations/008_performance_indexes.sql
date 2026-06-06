-- Add performance indexes for dashboard queries

-- MCQ sets performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcq_sets_user_created 
  ON mcq_sets(clerk_user_id, created_at DESC);

-- Chat threads performance index  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_threads_user_created
  ON chat_threads(clerk_user_id, created_at DESC);

-- Chat messages performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_thread_created
  ON chat_messages(thread_id, created_at ASC);

-- YouTube summaries performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_youtube_summaries_user_created
  ON youtube_summaries(clerk_user_id, created_at DESC);

-- Profiles performance index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_clerk_user
  ON profiles(clerk_user_id);

-- Add partial indexes for active content only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_mcq_questions_active
  ON mcq_questions(mcq_set_id, question_order) 
  WHERE question IS NOT NULL AND correct_answer IS NOT NULL;

-- Optimize RLS policies with better indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_attachments_thread
  ON chat_attachments(thread_id)
  WHERE deleted_at IS NULL;