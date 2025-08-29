-- ========================================
-- 데이터 초기화 + 샘플 데이터 재삽입 스크립트
-- ========================================
-- 이 스크립트는 모든 데이터를 삭제하고 기본 샘플 데이터를 다시 삽입합니다.
-- 실행 전에 반드시 백업을 확인하세요!

-- 1. 모든 데이터 삭제 (외래키 제약조건 순서 고려)
DELETE FROM schedule_completions;
DELETE FROM family_meals;
DELETE FROM meals;
DELETE FROM recipes;
DELETE FROM schedules;

-- 2. 기본 샘플 데이터 삽입

-- 기본 식단 메뉴들
INSERT INTO meals (meal_name, family_preference, status) VALUES
    ('김치찌개', 'Good', true),
    ('된장찌개', 'Not Bad', true),
    ('제육볶음', 'Good', true),
    ('순두부찌개', 'So So', true),
    ('계란말이', 'Good', true),
    ('김치볶음밥', 'Not Bad', true),
    ('라면', 'Bad', false),
    ('스파게티', 'Good', true),
    ('불고기', 'Good', true),
    ('닭볶음탕', 'Not Bad', true),
    ('된장국', 'Good', true),
    ('미역국', 'So So', true)
ON CONFLICT DO NOTHING;

-- 기본 레시피들
INSERT INTO recipes (title, content, ingredients, instructions) VALUES
    ('김치찌개', '매콤달콤한 김치찌개 레시피입니다.', '김치, 돼지고기, 두부, 파, 양파, 고춧가루', '1. 돼지고기를 볶습니다.\n2. 김치를 넣고 볶습니다.\n3. 물을 넣고 끓입니다.\n4. 두부를 넣고 완성합니다.'),
    ('된장찌개', '건강한 된장찌개 레시피입니다.', '된장, 두부, 애호박, 양파, 파, 고추', '1. 물을 끓입니다.\n2. 된장을 풀어줍니다.\n3. 채소를 넣고 끓입니다.\n4. 두부를 넣고 완성합니다.'),
    ('제육볶음', '매콤달콤한 제육볶음 레시피입니다.', '돼지고기, 양파, 당근, 파, 고추, 간장, 고춧가루', '1. 돼지고기를 양념에 재워둡니다.\n2. 채소를 썰어둡니다.\n3. 고기를 볶습니다.\n4. 채소를 넣고 볶아 완성합니다.'),
    ('계란말이', '부드러운 계란말이 레시피입니다.', '계란, 파, 당근, 소금, 식용유', '1. 계란을 깨서 휘저어줍니다.\n2. 채소를 다져서 넣습니다.\n3. 소금으로 간을 맞춥니다.\n4. 팬에 부어 말아줍니다.')
ON CONFLICT DO NOTHING;

-- 기본 일정들
INSERT INTO schedules (title, description, frequency, start_date, weekly_day, monthly_day) VALUES
    ('아침 운동', '30분 조깅 또는 스트레칭', 'daily', CURRENT_DATE, NULL, NULL),
    ('주간 회의', '팀 전체 회의', 'weekly', CURRENT_DATE, 1, NULL),
    ('월간 정리', '데이터 백업 및 정리', 'monthly', CURRENT_DATE, NULL, 15),
    ('금요일 팀 점심', '팀원들과 함께하는 점심 시간', 'weekly', CURRENT_DATE, 5, NULL),
    ('주말 정리', '주말 정리 및 계획 수립', 'weekly', CURRENT_DATE, 6, NULL)
ON CONFLICT DO NOTHING;

-- 3. 테이블 통계 정보 초기화 (성능 최적화)
ANALYZE;

-- 4. 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '데이터 초기화 및 샘플 데이터 삽입이 완료되었습니다.';
    RAISE NOTICE '새로운 데이터를 입력할 수 있습니다.';
END $$;

-- ========================================
-- 확인용 쿼리 (실행 후 데이터 확인)
-- ========================================
-- SELECT 'meals' as table_name, COUNT(*) as record_count FROM meals
-- UNION ALL
-- SELECT 'family_meals', COUNT(*) FROM family_meals
-- UNION ALL
-- SELECT 'recipes', COUNT(*) FROM recipes
-- UNION ALL
-- SELECT 'schedules', COUNT(*) FROM schedules
-- UNION ALL
-- SELECT 'schedule_completions', COUNT(*) FROM schedule_completions;

