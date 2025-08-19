# Supabase 설정 가이드

## 1. 프로젝트 생성

1. [Supabase](https://supabase.com)에 로그인
2. "New Project" 클릭
3. 프로젝트 이름과 데이터베이스 비밀번호 설정
4. 지역 선택 (가까운 지역 권장)

## 2. 환경 변수 설정

프로젝트가 생성되면 다음 정보를 복사하여 `.env.local` 파일에 저장:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 3. 데이터베이스 스키마 설정

### 3.1 SQL 에디터에서 스키마 실행

Supabase 대시보드의 "SQL Editor" 탭에서 `database/schema.sql` 파일의 내용을 실행:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create meals table (식단 리스트)
CREATE TABLE IF NOT EXISTS meals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    meal_name VARCHAR(255) NOT NULL,
    family_preference VARCHAR(20) CHECK (family_preference IN ('Good', 'Not Bad', 'So So', 'Bad', 'Not Yet')) DEFAULT 'Not Yet',
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_meals table (가족 식단)
CREATE TABLE IF NOT EXISTS family_meals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    breakfast VARCHAR(255),
    lunch VARCHAR(255),
    dinner VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create recipes table (레시피)
CREATE TABLE IF NOT EXISTS recipes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    ingredients TEXT,
    instructions TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedules table (일정 관리)
CREATE TABLE IF NOT EXISTS schedules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(20) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    weekly_day INTEGER CHECK (weekly_day >= 0 AND weekly_day <= 6),
    monthly_day INTEGER CHECK (monthly_day >= 1 AND monthly_day <= 31),
    custom_pattern TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create schedule_completions table (일정 완료 기록)
CREATE TABLE IF NOT EXISTS schedule_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    completed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(schedule_id, completion_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meals_meal_name ON meals(meal_name);
CREATE INDEX IF NOT EXISTS idx_meals_family_preference ON meals(family_preference);
CREATE INDEX IF NOT EXISTS idx_meals_status ON meals(status);
CREATE INDEX IF NOT EXISTS idx_family_meals_date ON family_meals(date);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes(title);
CREATE INDEX IF NOT EXISTS idx_schedules_frequency ON schedules(frequency);
CREATE INDEX IF NOT EXISTS idx_schedules_start_date ON schedules(start_date);
CREATE INDEX IF NOT EXISTS idx_schedules_weekly_day ON schedules(weekly_day);
CREATE INDEX IF NOT EXISTS idx_schedules_monthly_day ON schedules(monthly_day);
CREATE INDEX IF NOT EXISTS idx_schedule_completions_schedule_id ON schedule_completions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_completions_completion_date ON schedule_completions(completion_date);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_meals_updated_at BEFORE UPDATE ON meals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_meals_updated_at BEFORE UPDATE ON family_meals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO meals (meal_name, family_preference, status) VALUES
    ('김치찌개', 'Good', true),
    ('된장찌개', 'Not Bad', true),
    ('제육볶음', 'Good', true),
    ('순두부찌개', 'So So', true),
    ('계란말이', 'Good', true),
    ('김치볶음밥', 'Not Bad', true),
    ('라면', 'Bad', false),
    ('스파게티', 'Good', true)
ON CONFLICT DO NOTHING;

INSERT INTO recipes (title, content, ingredients, instructions) VALUES
    ('김치찌개', '매콤달콤한 김치찌개 레시피입니다.', '김치, 돼지고기, 두부, 파, 양파, 고춧가루', '1. 돼지고기를 볶습니다.\n2. 김치를 넣고 볶습니다.\n3. 물을 넣고 끓입니다.\n4. 두부를 넣고 완성합니다.'),
    ('된장찌개', '건강한 된장찌개 레시피입니다.', '된장, 두부, 애호박, 양파, 파, 고추', '1. 물을 끓입니다.\n2. 된장을 풀어줍니다.\n3. 채소를 넣고 끓입니다.\n4. 두부를 넣고 완성합니다.')
ON CONFLICT DO NOTHING;

-- Insert sample schedule data
INSERT INTO schedules (title, description, frequency, start_date, weekly_day, monthly_day) VALUES
    ('아침 운동', '30분 조깅 또는 스트레칭', 'daily', '2024-01-01', NULL, NULL),
    ('주간 회의', '팀 전체 회의', 'weekly', '2024-01-01', 1, NULL),
    ('월간 정리', '데이터 백업 및 정리', 'monthly', '2024-01-01', NULL, 15),
    ('금요일 팀 점심', '팀원들과 함께하는 점심 시간', 'weekly', '2024-01-01', 5, NULL)
ON CONFLICT DO NOTHING;
```

### 3.2 RLS (Row Level Security) 설정

각 테이블에 대해 RLS를 활성화하고 정책을 설정:

```sql
-- Enable RLS on all tables
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_completions ENABLE ROW LEVEL SECURITY;

-- Create policies (예시 - 모든 사용자가 읽기/쓰기 가능)
CREATE POLICY "Enable read access for all users" ON meals FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON meals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON meals FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON meals FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON family_meals FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON family_meals FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON family_meals FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON family_meals FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON recipes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON recipes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON recipes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON recipes FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON schedules FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON schedules FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON schedules FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON schedule_completions FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON schedule_completions FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON schedule_completions FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON schedule_completions FOR DELETE USING (true);
```

## 4. 스토리지 설정 (이미지 업로드용)

### 4.1 버킷 생성

"Storage" 탭에서 새 버킷 생성:
- 버킷 이름: `recipe-images`
- Public bucket: 체크
- File size limit: 50MB (또는 원하는 크기)

### 4.2 스토리지 정책 설정

```sql
-- Allow public access to recipe images
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'recipe-images');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'recipe-images');
CREATE POLICY "Public Update" ON storage.objects FOR UPDATE USING (bucket_id = 'recipe-images');
CREATE POLICY "Public Delete" ON storage.objects FOR DELETE USING (bucket_id = 'recipe-images');
```

## 5. 애플리케이션 실행

환경 변수가 설정되고 DB 스키마가 생성되면 애플리케이션을 실행할 수 있습니다:

```bash
npm run dev
```

## 6. 문제 해결

### 6.1 환경 변수 오류
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- Supabase URL과 API 키가 정확한지 확인

### 6.2 테이블 접근 오류
- RLS가 올바르게 설정되었는지 확인
- 정책이 올바르게 생성되었는지 확인

### 6.3 이미지 업로드 오류
- 스토리지 버킷이 생성되었는지 확인
- 스토리지 정책이 올바르게 설정되었는지 확인 