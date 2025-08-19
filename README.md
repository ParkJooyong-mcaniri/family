# Begin Cursor - 가족 일정 관리 시스템

가족을 위한 종합적인 일정 관리 및 식단 관리 시스템입니다.

## 주요 기능

### 📅 일정 관리
- **가족 구성원별 일정 관리**: 가족, 엄마, 아빠, 세인, 세하별로 일정을 구분하여 관리
- **다양한 주기 설정**: 매일, 매주 특정 요일, 매월 특정 일, 커스텀 패턴
- **캘린더 뷰**: 월별, 주별, 일별 뷰로 일정을 한눈에 확인
- **완료 상태 관리**: 일정별로 완료 여부를 체크하고 추적
- **가족 구성원 필터링**: 선택한 구성원의 일정만 필터링하여 보기

### 🍽️ 식단 관리
- **가족 식단 계획**: 아침, 점심, 저녁 식단을 날짜별로 관리
- **식단 선호도**: 각 가족 구성원의 식단 선호도를 기록하고 관리
- **레시피 관리**: 요리 방법과 재료를 체계적으로 정리

### 🏠 가족 구성원
- **가족**: 모든 구성원에게 표시되는 공통 일정
- **엄마**: 엄마만의 개인 일정
- **아빠**: 아빠만의 개인 일정  
- **세인**: 세인만의 개인 일정
- **세하**: 세하만의 개인 일정

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript
- **UI Components**: ShadCN UI, Tailwind CSS
- **Icons**: Lucide React
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel

## 설치 및 실행

### 1. 저장소 클론
```bash
git clone <repository-url>
cd begin-cursor
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 Supabase 설정을 추가하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. 데이터베이스 설정
Supabase 대시보드에서 다음 SQL을 실행하여 테이블을 생성하세요:

```sql
-- 기본 스키마 생성
\i database/schema.sql

-- 가족 구성원 컬럼 추가 (기존 테이블이 있는 경우)
\i database/migration-add-family-members.sql
```

### 5. 개발 서버 실행
```bash
npm run dev
```

## 데이터베이스 마이그레이션

### 가족 구성원 기능 추가
기존 일정 관리 시스템에 가족 구성원별 필터링 기능을 추가하려면:

```sql
-- Supabase 대시보드에서 실행
\i database/migration-add-family-members.sql
```

이 마이그레이션은:
- `schedules` 테이블에 `family_members` JSONB 컬럼 추가
- 기존 일정을 기본값 "가족"으로 설정
- 성능 향상을 위한 인덱스 생성

## 사용법

### 일정 추가
1. "일정 추가" 버튼 클릭
2. 일정명과 설명 입력
3. **대상 구성원 선택**: 가족 또는 개별 구성원 선택
   - 가족 선택 시: 모든 구성원에게 표시
   - 개별 구성원 선택 시: 해당 구성원에게만 표시
4. 주기 설정 (매일, 매주, 매월, 패턴)
5. 시작일과 종료일 설정
6. 저장

### 가족 구성원별 일정 보기
- 상단의 체크박스로 원하는 구성원 선택
- 가족 선택 시 모든 일정 표시
- 개별 구성원 선택 시 해당 구성원의 일정만 표시
- 여러 구성원을 동시에 선택 가능

### 일정 완료 관리
- 캘린더에서 각 일정의 체크박스 클릭
- 완료 상태가 실시간으로 업데이트
- 완료된 일정은 시각적으로 구분

## 프로젝트 구조

```
begin-cursor/
├── app/                    # Next.js 앱 라우터
│   ├── schedule/          # 일정 관리 페이지
│   ├── family-meals/      # 가족 식단 페이지
│   ├── meals/            # 식단 관리 페이지
│   └── recipes/          # 레시피 관리 페이지
├── components/            # 재사용 가능한 컴포넌트
│   ├── ui/               # ShadCN UI 컴포넌트
│   ├── Navigation.tsx    # 네비게이션 컴포넌트
│   └── ...               # 기타 컴포넌트
├── lib/                   # 유틸리티 및 API
│   ├── supabase-client.ts # Supabase 클라이언트
│   └── utils.ts          # 유틸리티 함수
├── database/              # 데이터베이스 스키마 및 마이그레이션
│   ├── schema.sql        # 기본 스키마
│   └── migration-add-family-members.sql # 가족 구성원 마이그레이션
└── docs/                  # 문서
```

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 지원

문제가 있거나 기능 요청이 있으시면 GitHub Issues를 통해 문의해 주세요.
