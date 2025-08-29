-- ========================================
-- 완전 초기화 스크립트 (테이블까지 모두 삭제)
-- ========================================
-- ⚠️  주의: 이 스크립트는 모든 테이블과 데이터를 완전히 삭제합니다!
-- 실행 전에 반드시 백업을 확인하세요!

-- 1. 모든 테이블 삭제 (외래키 제약조건 순서 고려)
DROP TABLE IF EXISTS schedule_completions CASCADE;
DROP TABLE IF EXISTS family_meals CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;

-- 2. 트리거 함수 삭제
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- 3. 인덱스 삭제 (테이블과 함께 자동 삭제되지만 명시적으로 삭제)
-- 인덱스는 테이블 삭제 시 자동으로 삭제되므로 별도 삭제 불필요

-- 4. UUID 확장 제거 (필요시 다시 생성)
-- DROP EXTENSION IF EXISTS "uuid-ossp";

-- 5. 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '모든 테이블과 데이터가 완전히 삭제되었습니다.';
    RAISE NOTICE '스키마를 다시 생성하려면 schema.sql을 실행하세요.';
END $$;

-- ========================================
-- 스키마 재생성 명령어 (필요시 실행)
-- ========================================
-- 이 스크립트 실행 후 다음 명령어로 스키마를 재생성할 수 있습니다:
-- 
-- 1. Supabase 대시보드의 SQL Editor에서 schema.sql 실행
-- 2. 또는 다음 명령어로 직접 실행:
--    \i database/schema.sql
-- 
-- ========================================
-- 확인용 쿼리 (실행 후 테이블이 존재하지 않는지 확인)
-- ========================================
-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('meals', 'family_meals', 'recipes', 'schedules', 'schedule_completions');

