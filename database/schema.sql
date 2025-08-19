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
    family_members JSONB DEFAULT '["family"]'::jsonb,
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