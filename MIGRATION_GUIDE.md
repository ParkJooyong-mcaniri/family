# 가족 구성원 기능 마이그레이션 가이드

이 가이드는 기존 일정 관리 시스템에 가족 구성원별 필터링 기능을 추가하는 방법을 설명합니다.

## 🚀 마이그레이션 개요

### 추가되는 기능
- **가족 구성원 구분**: 가족, 엄마, 아빠, 세인, 세하
- **멀티 선택 지원**: 여러 구성원을 동시에 선택 가능
- **스마트 필터링**: 가족 선택 시 모든 일정 표시, 개별 선택 시 해당 구성원 일정만 표시
- **시각적 구분**: 각 구성원별로 다른 색상의 배지로 구분

### 데이터베이스 변경사항
- `schedules` 테이블에 `family_members` JSONB 컬럼 추가
- 기본값: `["family"]` (모든 구성원에게 표시)
- 성능 향상을 위한 GIN 인덱스 추가

## 📋 마이그레이션 단계

### 1단계: 데이터베이스 백업 (권장)
```sql
-- 기존 데이터 백업 (선택사항)
CREATE TABLE schedules_backup AS SELECT * FROM schedules;
```

### 2단계: 새 컬럼 추가
```sql
-- family_members 컬럼 추가
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '["family"]'::jsonb;
```

### 3단계: 기존 데이터 업데이트
```sql
-- 기존 일정을 기본값 "가족"으로 설정
UPDATE schedules 
SET family_members = '["family"]'::jsonb 
WHERE family_members IS NULL;
```

### 4단계: 제약 조건 설정
```sql
-- 컬럼을 NOT NULL로 설정
ALTER TABLE schedules 
ALTER COLUMN family_members SET NOT NULL;
```

### 5단계: 인덱스 생성
```sql
-- 성능 향상을 위한 GIN 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_schedules_family_members 
ON schedules USING GIN (family_members);
```

### 6단계: 마이그레이션 확인
```sql
-- 마이그레이션 결과 확인
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'schedules' 
AND column_name = 'family_members';

-- 샘플 데이터 확인
SELECT id, title, family_members 
FROM schedules 
LIMIT 5;
```

## 🔧 자동 마이그레이션

### 전체 마이그레이션 스크립트 실행
```sql
-- Supabase 대시보드에서 실행
\i database/migration-add-family-members.sql
```

### 단계별 실행
```bash
# 1. 마이그레이션 파일 확인
cat database/migration-add-family-members.sql

# 2. Supabase 대시보드에서 SQL 편집기 열기
# 3. 마이그레이션 스크립트 복사하여 실행
```

## 📊 마이그레이션 후 데이터 구조

### 예시 데이터
```json
{
  "id": "uuid-1234",
  "title": "아침 운동",
  "description": "30분 조깅",
  "frequency": "daily",
  "start_date": "2024-01-01",
  "family_members": ["family"]  // 모든 구성원에게 표시
}

{
  "id": "uuid-5678", 
  "title": "엄마 요가",
  "description": "집에서 요가",
  "frequency": "weekly",
  "start_date": "2024-01-01",
  "family_members": ["mom"]     // 엄마에게만 표시
}

{
  "id": "uuid-9012",
  "title": "세인 숙제",
  "description": "수학 숙제",
  "frequency": "daily",
  "start_date": "2024-01-01",
  "family_members": ["sein"]    // 세인에게만 표시
}
```

## ⚠️ 주의사항

### 마이그레이션 전
- **데이터 백업**: 중요한 데이터가 있다면 반드시 백업
- **테스트 환경**: 가능하면 테스트 환경에서 먼저 실행
- **애플리케이션 중단**: 마이그레이션 중에는 애플리케이션 사용 중단

### 마이그레이션 중
- **에러 처리**: 오류 발생 시 즉시 중단하고 원인 파악
- **로그 확인**: Supabase 로그에서 오류 메시지 확인
- **단계별 실행**: 문제 발생 시 단계별로 실행하여 문제 지점 파악

### 마이그레이션 후
- **데이터 검증**: 샘플 데이터로 마이그레이션 결과 확인
- **애플리케이션 테스트**: 새 기능이 정상 작동하는지 확인
- **성능 모니터링**: 인덱스가 제대로 작동하는지 확인

## 🔍 문제 해결

### 일반적인 문제들

#### 1. 컬럼이 이미 존재하는 경우
```sql
-- 에러: column "family_members" of relation "schedules" already exists
-- 해결: IF NOT EXISTS 사용
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS family_members JSONB DEFAULT '["family"]'::jsonb;
```

#### 2. JSONB 타입 오류
```sql
-- 에러: invalid input syntax for type jsonb
-- 해결: 올바른 JSON 형식 사용
UPDATE schedules 
SET family_members = '["family"]'::jsonb;
```

#### 3. 인덱스 생성 실패
```sql
-- 에러: relation "idx_schedules_family_members" already exists
-- 해결: IF NOT EXISTS 사용
CREATE INDEX IF NOT EXISTS idx_schedules_family_members 
ON schedules USING GIN (family_members);
```

### 복구 방법

#### 마이그레이션 롤백
```sql
-- 1. 새 컬럼 제거
ALTER TABLE schedules DROP COLUMN family_members;

-- 2. 인덱스 제거
DROP INDEX IF EXISTS idx_schedules_family_members;

-- 3. 백업에서 데이터 복원 (필요시)
-- DROP TABLE schedules;
-- ALTER TABLE schedules_backup RENAME TO schedules;
```

## 📞 지원

마이그레이션 중 문제가 발생하거나 추가 도움이 필요하시면:

1. **GitHub Issues**: 프로젝트 저장소에 이슈 생성
2. **Supabase 지원**: Supabase 공식 문서 및 커뮤니티 참조
3. **로그 확인**: Supabase 대시보드에서 로그 및 오류 메시지 확인

## ✅ 체크리스트

- [ ] 데이터베이스 백업 완료
- [ ] 마이그레이션 스크립트 검토
- [ ] 테스트 환경에서 실행 (권장)
- [ ] 프로덕션 환경에서 마이그레이션 실행
- [ ] 새 컬럼 추가 확인
- [ ] 기존 데이터 업데이트 확인
- [ ] 인덱스 생성 확인
- [ ] 애플리케이션 테스트 완료
- [ ] 성능 모니터링 시작

---

**마이그레이션 완료 후 애플리케이션을 재시작하여 새로운 기능을 사용할 수 있습니다.**

