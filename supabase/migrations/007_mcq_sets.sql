    -- MCQ Sets table
    CREATE TABLE mcq_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('topic', 'pdf', 'youtube')),
    source_id TEXT, -- Optional: summaryId for PDF/YouTube
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- MCQ Questions table
    CREATE TABLE mcq_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcq_set_id UUID NOT NULL REFERENCES mcq_sets(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
    explanation TEXT NOT NULL, -- Now required/non-nullable
    question_order INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX mcq_sets_user_id_idx ON mcq_sets(clerk_user_id);
    CREATE INDEX mcq_sets_created_at_idx ON mcq_sets(created_at DESC);
    CREATE INDEX mcq_questions_set_id_idx ON mcq_questions(mcq_set_id);
    CREATE INDEX mcq_questions_order_idx ON mcq_questions(mcq_set_id, question_order);

    -- RLS policies
    ALTER TABLE mcq_sets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE mcq_questions ENABLE ROW LEVEL SECURITY;

    -- Users can only access their own MCQ sets
    CREATE POLICY "Users can view own MCQ sets" ON mcq_sets
    FOR SELECT USING (clerk_user_id = current_setting('app.clerk_user_id'));

    CREATE POLICY "Users can create own MCQ sets" ON mcq_sets
    FOR INSERT WITH CHECK (clerk_user_id = current_setting('app.clerk_user_id'));

    CREATE POLICY "Users can update own MCQ sets" ON mcq_sets
    FOR UPDATE USING (clerk_user_id = current_setting('app.clerk_user_id'));

    CREATE POLICY "Users can delete own MCQ sets" ON mcq_sets
    FOR DELETE USING (clerk_user_id = current_setting('app.clerk_user_id'));

    -- Users can only access questions from their MCQ sets
    CREATE POLICY "Users can view questions from own MCQ sets" ON mcq_questions
    FOR SELECT USING (
        EXISTS (
        SELECT 1 FROM mcq_sets 
        WHERE mcq_sets.id = mcq_questions.mcq_set_id 
        AND mcq_sets.clerk_user_id = current_setting('app.clerk_user_id')
        )
    );

    CREATE POLICY "Users can create questions in own MCQ sets" ON mcq_questions
    FOR INSERT WITH CHECK (
        EXISTS (
        SELECT 1 FROM mcq_sets 
        WHERE mcq_sets.id = mcq_questions.mcq_set_id 
        AND mcq_sets.clerk_user_id = current_setting('app.clerk_user_id')
        )
    );

    CREATE POLICY "Users can update questions in own MCQ sets" ON mcq_questions
    FOR UPDATE USING (
        EXISTS (
        SELECT 1 FROM mcq_sets 
        WHERE mcq_sets.id = mcq_questions.mcq_set_id 
        AND mcq_sets.clerk_user_id = current_setting('app.clerk_user_id')
        )
    );

    CREATE POLICY "Users can delete questions from own MCQ sets" ON mcq_questions
    FOR DELETE USING (
        EXISTS (
        SELECT 1 FROM mcq_sets 
        WHERE mcq_sets.id = mcq_questions.mcq_set_id 
        AND mcq_sets.clerk_user_id = current_setting('app.clerk_user_id')
        )
    );