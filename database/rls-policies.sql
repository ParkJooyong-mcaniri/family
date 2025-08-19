-- Row Level Security (RLS) 정책 설정

-- 1. RLS 활성화
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- 2. 기존 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Allow all operations" ON meals;
DROP POLICY IF EXISTS "Allow all operations" ON family_meals;
DROP POLICY IF EXISTS "Allow all operations" ON recipes;

-- 3. 새로운 정책 생성 - 모든 작업 허용 (개발 단계)
CREATE POLICY "Allow all operations" ON meals FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON family_meals FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON recipes FOR ALL USING (true);

-- 4. 더 세밀한 정책 (선택사항 - 나중에 사용할 수 있음)
-- CREATE POLICY "Allow select for all" ON meals FOR SELECT USING (true);
-- CREATE POLICY "Allow insert for all" ON meals FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update for all" ON meals FOR UPDATE USING (true);
-- CREATE POLICY "Allow delete for all" ON meals FOR DELETE USING (true);

-- CREATE POLICY "Allow select for all" ON family_meals FOR SELECT USING (true);
-- CREATE POLICY "Allow insert for all" ON family_meals FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update for all" ON family_meals FOR UPDATE USING (true);
-- CREATE POLICY "Allow delete for all" ON family_meals FOR DELETE USING (true);

-- CREATE POLICY "Allow select for all" ON recipes FOR SELECT USING (true);
-- CREATE POLICY "Allow insert for all" ON recipes FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow update for all" ON recipes FOR UPDATE USING (true);
-- CREATE POLICY "Allow delete for all" ON recipes FOR DELETE USING (true); 