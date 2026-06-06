-- Flashcards table for favorite questions
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    mcq_question_id UUID NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique flashcards per user per question
    UNIQUE(clerk_user_id, mcq_question_id)
);

-- Indexes for performance
CREATE INDEX flashcards_user_id_idx ON flashcards(clerk_user_id);
CREATE INDEX flashcards_added_at_idx ON flashcards(added_at DESC);
CREATE INDEX flashcards_question_id_idx ON flashcards(mcq_question_id);

-- RLS policies
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

-- Users can only access their own flashcards
CREATE POLICY "Users can view own flashcards" ON flashcards
    FOR SELECT USING (clerk_user_id = current_setting('app.clerk_user_id'));

CREATE POLICY "Users can create own flashcards" ON flashcards
    FOR INSERT WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id'));

CREATE POLICY "Users can delete own flashcards" ON flashcards
    FOR DELETE USING (clerk_user_id = current_setting('app.clerk_user_id'));