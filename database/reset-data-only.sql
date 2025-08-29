-- ========================================
-- 데이터 초기화 스크립트 (데이터만 삭제)
-- ========================================
-- 이 스크립트는 모든 테이블의 데이터만 삭제하고 테이블 구조는 유지합니다.
-- 실행 전에 반드시 백업을 확인하세요!

-- 1. 외래키 제약조건이 있는 테이블부터 삭제 (순서 중요)
DELETE FROM schedule_completions;
DELETE FROM family_meals;
DELETE FROM meals;
DELETE FROM recipes;
DELETE FROM schedules;

-- 2. 시퀀스/시퀀스 값 초기화 (UUID는 자동 생성되므로 불필요)
-- PostgreSQL의 UUID는 자동 생성되므로 별도 초기화 불필요

-- 3. 테이블 통계 정보 초기화 (성능 최적화)
ANALYZE;

-- 4. 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '모든 데이터가 성공적으로 삭제되었습니다.';
    RAISE NOTICE '테이블 구조는 그대로 유지됩니다.';
    RAISE NOTICE '새로운 데이터를 입력할 수 있습니다.';
END $$;

-- ========================================
-- 확인용 쿼리 (실행 후 테이블이 비어있는지 확인)
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

