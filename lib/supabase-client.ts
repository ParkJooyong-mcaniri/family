import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 환경 변수 확인 로깅 (개발 모드에서만)
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase 환경 변수 확인:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlLength: supabaseUrl?.length || 0,
    keyLength: supabaseAnonKey?.length || 0
  });
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }
})

// Supabase 연결 테스트 함수
export const testSupabaseConnection = async () => {
  try {
    console.log('Supabase 연결 테스트 시작...');
    
    // 간단한 쿼리로 연결 테스트
    const { data, error } = await supabase
      .from('family_meals')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase 연결 테스트 실패:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false;
    }
    
    console.log('Supabase 연결 테스트 성공:', { data });
    return true;
  } catch (error) {
    console.error('Supabase 연결 테스트 중 예외 발생:', error);
    return false;
  }
};

// Database types
export interface Meal {
  id: string
  meal_name: string
  family_preference: 'Good' | 'Not Bad' | 'So So' | 'Bad' | 'Not Yet'
  status: boolean
  created_at: string
  updated_at: string
}

export interface FamilyMeal {
  id: string
  date: string
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  created_at: string
  updated_at: string
}

export interface Recipe {
  id: string
  title: string
  content: string
  ingredients: string
  instructions: string
  images: string[]
  created_at: string
  updated_at: string
}

// Family member constants
export const FAMILY_MEMBERS = {
  FAMILY: 'family',
  MOM: 'mom',
  DAD: 'dad',
  SEIN: 'sein',
  SEHA: 'seha'
} as const;

export type FamilyMember = typeof FAMILY_MEMBERS[keyof typeof FAMILY_MEMBERS];

export const FAMILY_MEMBER_LABELS: Record<FamilyMember, string> = {
  [FAMILY_MEMBERS.FAMILY]: '가족',
  [FAMILY_MEMBERS.MOM]: '엄마',
  [FAMILY_MEMBERS.DAD]: '아빠',
  [FAMILY_MEMBERS.SEIN]: '세인',
  [FAMILY_MEMBERS.SEHA]: '세하'
};

export const FAMILY_MEMBER_COLORS: Record<FamilyMember, string> = {
  [FAMILY_MEMBERS.FAMILY]: 'bg-blue-100 text-blue-800',
  [FAMILY_MEMBERS.MOM]: 'bg-pink-100 text-pink-800',
  [FAMILY_MEMBERS.DAD]: 'bg-blue-100 text-blue-800',
  [FAMILY_MEMBERS.SEIN]: 'bg-green-100 text-green-800',
  [FAMILY_MEMBERS.SEHA]: 'bg-purple-100 text-purple-800'
};

export interface Schedule {
  id: string
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  start_time: string
  end_time: string
  start_date: string
  end_date?: string
  weekly_day?: number
  monthly_day?: number
  custom_pattern?: string
  family_members: FamilyMember[]
  created_at: string
  updated_at: string
}

export interface ScheduleCompletion {
  id: string
  schedule_id: string
  completion_date: string
  completed: boolean
  created_at: string
}

// Database functions
export const mealsApi = {
  // Get all meals
  async getAll() {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Meal[]
  },

  // Get meals by search term
  async search(searchTerm: string) {
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .ilike('meal_name', `%${searchTerm}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Meal[]
  },

  // Create new meal
  async create(meal: Omit<Meal, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('meals')
      .insert([meal])
      .select()
      .single()
    
    if (error) throw error
    return data as Meal
  },

  // Update meal
  async update(id: string, updates: Partial<Meal>) {
    const { data, error } = await supabase
      .from('meals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Meal
  },

  // Delete meal
  async delete(id: string) {
    const { error } = await supabase
      .from('meals')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const familyMealsApi = {
  // Get family meal by date
  async getByDate(date: string) {
    const { data, error } = await supabase
      .from('family_meals')
      .select('*')
      .eq('date', date)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data as FamilyMeal | null
  },

  // Create or update family meal
  async upsert(familyMeal: Omit<FamilyMeal, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('family_meals')
      .upsert([familyMeal], { onConflict: 'date' })
      .select()
      .single()
    
    if (error) throw error
    return data as FamilyMeal
  },

  // Get family meals for a month
  async getByMonth(year: number, month: number) {
    try {
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
      // 해당 월의 마지막 날을 정확히 계산
      const lastDayOfMonth = new Date(year, month, 0).getDate()
      const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`
      
      console.log('getByMonth 호출:', { year, month, startDate, endDate });
      
      console.log('Supabase 쿼리 실행:', {
        table: 'family_meals',
        startDate,
        endDate,
        query: `SELECT * FROM family_meals WHERE date >= '${startDate}' AND date <= '${endDate}' ORDER BY date ASC`
      });
      
      const { data, error } = await supabase
        .from('family_meals')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })
      
      if (error) {
        // 에러 객체를 문자열로 변환하여 로깅
        console.error('=== Supabase 에러 발생 ===');
        console.error('에러 타입:', typeof error);
        console.error('에러 생성자:', error.constructor?.name);
        
        // 에러 객체의 기본 정보 로깅
        console.error('에러 기본 정보:');
        console.error('  타입:', typeof error);
        console.error('  생성자:', error?.constructor?.name);
        
        // 에러 객체를 문자열로 변환 시도
        try {
          const errorString = String(error);
          console.error('에러 문자열:', errorString);
        } catch {
          console.error('문자열 변환 실패');
        }
        
        // 에러 객체를 JSON으로 변환 시도
        try {
          const errorJson = JSON.stringify(error);
          console.error('에러 JSON:', errorJson);
        } catch {
          console.error('JSON 변환 실패');
        }
        
        // 에러 객체를 JSON으로 변환 시도
        try {
          const errorJson = JSON.stringify(error);
          console.error('에러 JSON:', errorJson);
        } catch (e) {
          console.error('JSON 변환 실패:', e);
        }
        
        // 에러 객체를 문자열로 변환 시도
        try {
          const errorString = String(error);
          console.error('에러 문자열:', errorString);
        } catch (e) {
          console.error('문자열 변환 실패:', e);
        }
        
        throw error;
      }
      
      console.log('getByMonth 성공:', { dataCount: data?.length || 0, data });
      return data as FamilyMeal[]
    } catch (error) {
      console.error('=== getByMonth 함수 에러 발생 ===');
      console.error('에러 타입:', typeof error);
      console.error('에러 생성자:', error?.constructor?.name);
      
      if (error instanceof Error) {
        console.error('Error 인스턴스 정보:');
        console.error('  name:', error.name);
        console.error('  message:', error.message);
        console.error('  stack:', error.stack);
      } else {
        console.error('Error 인스턴스가 아님');
      }
      
              // 에러 객체를 문자열로 변환 시도
        try {
          const errorString = String(error);
          console.error('에러 문자열:', errorString);
        } catch {
          console.error('문자열 변환 실패');
        }
        
        // 에러 객체를 JSON으로 변환 시도
        try {
          const errorJson = JSON.stringify(error);
          console.error('에러 JSON:', errorJson);
        } catch {
          console.error('JSON 변환 실패');
        }
      
      throw error;
    }
  }
}

export const recipesApi = {
  // Get all recipes
  async getAll() {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Recipe[]
  },

  // Get recipe by id
  async getById(id: string) {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Recipe
  },

  // Search recipes
  async search(searchTerm: string) {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return data as Recipe[]
  },

  // Create new recipe
  async create(recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('recipes')
      .insert([recipe])
      .select()
      .single()
    
    if (error) throw error
    return data as Recipe
  },

  // Update recipe
  async update(id: string, updates: Partial<Recipe>) {
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Recipe
  },

  // Delete recipe
  async delete(id: string) {
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const schedulesApi = {
  // Get all schedules
  async getAll() {
    try {
      console.log('일정 전체 조회 시작');
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('일정 전체 조회 오류:', error);
        throw error;
      }
      
      console.log('일정 전체 조회 성공:', data?.length || 0, '개');
      return data as Schedule[]
    } catch (error) {
      console.error('일정 전체 조회 전체 오류:', error);
      throw error;
    }
  },

  // Get schedule by id
  async getById(id: string) {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data as Schedule
  },

  // Create new schedule
  async create(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at'>) {
    try {
      console.log('일정 생성 시작:', schedule);
      
      // null과 undefined 값 제거하고 기본값 설정
      const cleanSchedule = {
        title: schedule.title || '',
        description: schedule.description || null,
        frequency: schedule.frequency || 'daily',
        start_time: schedule.start_time || null,
        end_time: schedule.end_time || null,
        start_date: schedule.start_date || new Date().toISOString().split('T')[0],
        end_date: schedule.end_date || null,
        weekly_day: schedule.weekly_day !== undefined ? schedule.weekly_day : null,
        monthly_day: schedule.monthly_day || null,
        custom_pattern: schedule.custom_pattern || null,
        family_members: schedule.family_members || [],
      };
      
      console.log('정리된 데이터:', cleanSchedule);
      
      // 데이터 유효성 검사
      if (!cleanSchedule.title.trim()) {
        throw new Error('일정 제목은 필수입니다.');
      }
      
      if (!cleanSchedule.start_date) {
        throw new Error('시작일은 필수입니다.');
      }
      
      const { data, error } = await supabase
        .from('schedules')
        .insert([cleanSchedule])
        .select()
        .single()
      
      if (error) {
        console.error('일정 생성 오류:', error);
        console.error('오류 코드:', error.code);
        console.error('오류 메시지:', error.message);
        console.error('오류 상세:', error.details);
        throw error;
      }
      
      console.log('일정 생성 성공:', data);
      return data as Schedule
    } catch (error) {
      console.error('일정 생성 전체 오류:', error);
      throw error;
    }
  },

  // Update schedule
  async update(id: string, updates: Partial<Schedule>) {
    try {
      console.log('일정 수정 시작:', { id, updates });
      
      // undefined 값 제거
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      console.log('정리된 업데이트:', cleanUpdates);
      
      const { data, error } = await supabase
        .from('schedules')
        .update(cleanUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('일정 수정 오류:', error);
        throw error;
      }
      
      console.log('일정 수정 성공:', data);
      return data as Schedule
    } catch (error) {
      console.error('일정 수정 전체 오류:', error);
      throw error;
    }
  },

  // Delete schedule
  async delete(id: string) {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },

  // Get completion status for a specific date
  async getCompletionStatus(scheduleId: string, date: string) {
    const { data, error } = await supabase
      .from('schedule_completions')
      .select('*')
      .eq('schedule_id', scheduleId)
      .eq('completion_date', date)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data as ScheduleCompletion | null
  },

  // Get completion statuses for multiple schedules and dates (일괄 조회)
  async getCompletionStatuses(scheduleIds: string[], startDate: string, endDate: string) {
    try {
      console.log('일괄 완료 상태 조회 시작:', { scheduleIds: scheduleIds.length, startDate, endDate });
      
      if (scheduleIds.length === 0) {
        console.log('일정 ID가 없어서 빈 배열 반환');
        return [];
      }
      
      const { data, error } = await supabase
        .from('schedule_completions')
        .select('*')
        .in('schedule_id', scheduleIds)
        .gte('completion_date', startDate)
        .lte('completion_date', endDate)
      
      if (error) {
        console.error('일괄 완료 상태 조회 오류:', error);
        throw error;
      }
      
      console.log('일괄 완료 상태 조회 성공:', data?.length || 0, '개');
      return data as ScheduleCompletion[]
    } catch (error) {
      console.error('일괄 완료 상태 조회 전체 오류:', error);
      throw error;
    }
  },

  // Toggle completion status
  async toggleCompletion(scheduleId: string, date: string, completed: boolean) {
    try {
      console.log('toggleCompletion 시작:', { scheduleId, date, completed });
      
      // 입력값 검증
      if (!scheduleId || !date || typeof completed !== 'boolean') {
        throw new Error('잘못된 파라미터입니다.');
      }
      
      const existing = await this.getCompletionStatus(scheduleId, date);
      console.log('기존 완료 상태:', existing);
      
      if (existing) {
        // Update existing completion
        console.log('기존 완료 기록 업데이트:', existing.id);
        const { data, error } = await supabase
          .from('schedule_completions')
          .update({ completed })
          .eq('id', existing.id)
          .select()
          .single()
        
        if (error) {
          console.error('업데이트 오류:', error);
          console.error('오류 코드:', error.code);
          console.error('오류 메시지:', error.message);
          console.error('오류 상세:', error.details);
          throw error;
        }
        
        console.log('업데이트 성공:', data);
        return data as ScheduleCompletion
      } else {
        // Create new completion
        console.log('새 완료 기록 생성');
        const insertData = {
          schedule_id: scheduleId,
          completion_date: date,
          completed
        };
        console.log('삽입할 데이터:', insertData);
        
        const { data, error } = await supabase
          .from('schedule_completions')
          .insert([insertData])
          .select()
          .single()
        
        if (error) {
          console.error('생성 오류:', error);
          console.error('오류 코드:', error.code);
          console.error('오류 메시지:', error.message);
          console.error('오류 상세:', error.details);
          throw error;
        }
        
        console.log('생성 성공:', data);
        return data as ScheduleCompletion
      }
    } catch (error) {
      console.error('toggleCompletion 전체 오류:', error);
      
      // Supabase 오류인지 확인
      if (error && typeof error === 'object' && 'code' in error) {
        const supabaseError = error as { code?: string; message?: string };
        console.error('Supabase 오류 코드:', supabaseError.code);
        console.error('Supabase 오류 메시지:', supabaseError.message);
      }
      
      throw error;
    }
  },

  // Get today's schedules for specific family members
  async getTodaySchedulesByMember(familyMembers: string[]) {
    try {
      console.log('가족 구성원별 오늘 일정 조회 시작:', familyMembers);
      
      // 한국 시간대 기준으로 오늘 날짜 계산
      const now = new Date();
      
      // 로컬 시간대가 이미 한국 시간인지 확인
      const localOffset = now.getTimezoneOffset();
      const koreaOffset = 9 * 60; // 한국은 UTC+9
      
      let today: string;
      let dayOfWeek: number;
      let dayOfMonth: number;
      
      if (Math.abs(localOffset + koreaOffset) < 60) {
        // 로컬 시간대가 한국 시간과 비슷하면 그대로 사용
        today = now.toISOString().split('T')[0];
        dayOfWeek = now.getDay();
        dayOfMonth = now.getDate();
        console.log('로컬 시간대 사용 (한국 시간과 유사)');
      } else {
        // UTC 기준으로 한국 시간 계산
        const utcTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000));
        const koreaTime = new Date(utcTime.getTime() + (koreaOffset * 60 * 1000));
        today = koreaTime.toISOString().split('T')[0];
        dayOfWeek = koreaTime.getDay();
        dayOfMonth = koreaTime.getDate();
        console.log('UTC 기준 한국 시간 계산');
      }
      
      console.log('한국 시간 기준 오늘 날짜 정보:', { 
        now: now.toISOString(),
        localOffset,
        koreaOffset,
        today, 
        dayOfWeek, 
        dayOfMonth,
        localDate: now.toLocaleDateString('ko-KR'),
        localDay: now.getDay()
      });
      
      // 모든 일정을 한 번에 가져와서 JavaScript에서 필터링
      console.log('전체 일정 조회 시작...');
      
      let allSchedules: Array<{
        id: string;
        title: string;
        description?: string;
        frequency: string;
        start_date: string;
        end_date?: string;
        family_members: string[];
        custom_pattern?: string;
        weekly_day?: number;
        monthly_day?: number;
        created_at: string;
        updated_at: string;
      }> = [];
      
      try {
        const { data, error: allError } = await supabase
          .from('schedules')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (allError) {
          console.error('전체 일정 조회 오류:', {
            error: allError,
            errorCode: allError.code,
            errorMessage: allError.message,
            errorDetails: allError.details,
            hint: allError.hint
          });
          return {};
        }
        
        if (!data || !Array.isArray(data)) {
          console.warn('전체 일정 데이터가 배열이 아님:', data);
          return {};
        }
        
        allSchedules = data;
        console.log('전체 일정 조회 완료:', allSchedules.length, '개');
        
        if (allSchedules.length > 0) {
          console.log('첫 번째 일정 예시:', allSchedules[0]);
        }
      } catch (allError) {
        console.error('전체 일정 조회 중 예외 발생:', allError);
        return {};
      }
      
      // 각 가족 구성원별로 일정 필터링
      const memberSchedules: { [key: string]: Array<{
        id: string;
        title: string;
        description?: string;
        frequency: string;
        start_date: string;
        end_date?: string;
        family_members: string[];
        custom_pattern?: string;
        weekly_day?: number;
        monthly_day?: number;
        created_at: string;
        updated_at: string;
        completed: boolean;
      }> } = {};
      
      for (const member of familyMembers) {
        try {
          console.log(`${member} 일정 필터링 시작`);
          
          // 해당 구성원의 일정만 필터링
          const todaySchedules = allSchedules?.filter(schedule => {
            try {
              console.log(`${member} 일정 "${schedule.title}" 필터링 시작:`, {
                family_members: schedule.family_members,
                frequency: schedule.frequency,
                start_date: schedule.start_date,
                end_date: schedule.end_date
              });
              
              // family_members 배열에 해당 구성원이 포함되어 있는지 확인
              if (!schedule.family_members || !Array.isArray(schedule.family_members)) {
                console.log(`${member} 일정 "${schedule.title}" family_members 없음 또는 배열 아님`);
                return false;
              }
              
              const hasMember = schedule.family_members.includes(member);
              if (!hasMember) {
                console.log(`${member} 일정 "${schedule.title}" 해당 구성원 포함 안됨:`, schedule.family_members);
                return false;
              }
              
              console.log(`${member} 일정 "${schedule.title}" 구성원 포함 확인됨`);
              
              // 시작일 체크 - 시작일이 오늘 이전이거나 오늘이어야 함
              if (schedule.start_date) {
                // schedule.start_date와 today를 모두 YYYY-MM-DD 형식으로 비교
                const scheduleStartDate = schedule.start_date;
                if (scheduleStartDate > today) {
                  console.log(`${member} 일정 "${schedule.title}" 시작일이 미래:`, scheduleStartDate, 'vs 오늘:', today);
                  return false; // 시작일이 미래인 일정 제외
                }
                console.log(`${member} 일정 "${schedule.title}" 시작일 확인됨:`, scheduleStartDate);
              }
              
              // 종료일 체크 - 종료일이 오늘 이후이거나 없어야 함
              if (schedule.end_date) {
                // schedule.end_date와 today를 모두 YYYY-MM-DD 형식으로 비교
                const scheduleEndDate = schedule.end_date;
                if (scheduleEndDate < today) {
                  console.log(`${member} 일정 "${schedule.title}" 종료일이 지남:`, scheduleEndDate, 'vs 오늘:', today);
                  return false; // 종료일이 지난 일정 제외
                }
                console.log(`${member} 일정 "${schedule.title}" 종료일 확인됨:`, scheduleEndDate);
              }
              
              console.log(`${member} 일정 "${schedule.title}" 날짜 범위 확인 완료, 빈도별 필터링 시작`);
              
              // 일정관리 페이지와 동일한 로직으로 빈도별 필터링
              let shouldInclude = false;
              
              switch (schedule.frequency) {
                case 'daily':
                  shouldInclude = true;
                  break;
                case 'weekly':
                  if (schedule.weekly_day !== null && schedule.weekly_day !== undefined) {
                    // weekly_day가 1(월요일)~7(일요일)인 경우와 0(일요일)~6(토요일)인 경우 모두 처리
                    let scheduleDay = schedule.weekly_day;
                    
                    // weekly_day는 이미 0~6 형식으로 저장되므로 변환 불필요
                    
                    shouldInclude = dayOfWeek === scheduleDay;
                  } else {
                    // 주차 기반 - 일요일 기준으로 수정
                    const startDate = new Date(schedule.start_date);
                    const todayDate = new Date(today);
                    const weekStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - startDate.getDay());
                    const currentWeekStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - todayDate.getDay());
                    const weekDiff = Math.floor((currentWeekStart.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
                    shouldInclude = weekDiff >= 0 && weekDiff % 1 === 0;
                  }
                  break;
                case 'monthly':
                  if (schedule.monthly_day !== null && schedule.monthly_day !== undefined) {
                    shouldInclude = dayOfMonth === schedule.monthly_day;
                  } else {
                    // 시작일 기준
                    const startDate = new Date(schedule.start_date);
                    shouldInclude = dayOfMonth === startDate.getDate();
                  }
                  break;
                case 'custom':
                  // 패턴 처리 - 일정관리 페이지와 동일한 로직
                  if (schedule.custom_pattern) {
                    try {
                      console.log(`${member} "${schedule.title}" custom_pattern 원본:`, schedule.custom_pattern);
                      
                      // custom_pattern이 JSON 문자열인 경우 파싱
                      let pattern;
                      if (typeof schedule.custom_pattern === 'string') {
                        pattern = JSON.parse(schedule.custom_pattern);
                      } else {
                        pattern = schedule.custom_pattern;
                      }
                      
                      console.log(`${member} "${schedule.title}" custom_pattern 상세 분석:`, {
                        raw: schedule.custom_pattern,
                        parsed: pattern,
                        type: pattern.type,
                        today: today,
                        dayOfWeek: dayOfWeek,
                        startDate: schedule.start_date
                      });
                      
                      // 패턴에 따른 처리
                      if (pattern.type === 'interval') {
                        // 간격 기반 (예: 3일마다)
                        const startDate = new Date(schedule.start_date);
                        const todayDate = new Date(today);
                        const daysDiff = Math.floor((todayDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
                        shouldInclude = daysDiff >= 0 && daysDiff % pattern.interval === 0;
                        console.log(`${member} "${schedule.title}" interval 패턴 결과:`, { daysDiff, interval: pattern.interval, shouldInclude });
                      } else if (pattern.type === 'specific_days') {
                        // 특정 요일들 (예: 월,수,금)
                        const hasDays = pattern.days && Array.isArray(pattern.days);
                        const includesToday = hasDays && pattern.days.includes(dayOfWeek);
                        shouldInclude = includesToday;
                        
                        console.log(`${member} "${schedule.title}" specific_days 패턴 상세 분석:`, {
                          patternDays: pattern.days,
                          todayDay: dayOfWeek,
                          hasDays,
                          includesToday,
                          shouldInclude,
                          calculation: `${dayOfWeek} ∉ [${pattern.days?.join(', ')}] = ${!includesToday}`
                        });
                      } else if (pattern.type === 'weekday') {
                        // 평일만 (월~금)
                        shouldInclude = dayOfWeek >= 1 && dayOfWeek <= 5;
                        console.log(`${member} "${schedule.title}" weekday 패턴 결과:`, { todayDay: dayOfWeek, shouldInclude });
                      } else if (pattern.type === 'weekend') {
                        // 주말만 (토,일)
                        shouldInclude = dayOfWeek === 0 || dayOfWeek === 6;
                        console.log(`${member} "${schedule.title}" weekend 패턴 결과:`, { todayDay: dayOfWeek, shouldInclude });
                      } else {
                        // 기본값: 시작일부터 매일
                        shouldInclude = true;
                        console.log(`${member} "${schedule.title}" 기본 패턴: 시작일부터 매일 실행`);
                      }
                    } catch (error) {
                      console.error(`${member} 패턴 파싱 오류:`, error);
                      // 파싱 실패 시 기본값으로 처리
                      shouldInclude = true;
                    }
                  } else {
                    // custom_pattern이 없으면 시작일부터 매일
                    shouldInclude = true;
                    console.log(`${member} "${schedule.title}" custom_pattern 없음: 시작일부터 매일 실행`);
                  }
                  break;
                default:
                  shouldInclude = false;
              }
              
              if (!shouldInclude) {
                console.log(`${member} 일정 "${schedule.title}" 오늘 실행 안됨:`, {
                  frequency: schedule.frequency,
                  weekly_day: schedule.weekly_day,
                  monthly_day: schedule.monthly_day,
                  start_date: schedule.start_date,
                  today: today,
                  dayOfWeek,
                  dayOfMonth
                });
              }
              
              return shouldInclude;
            } catch (filterError) {
              console.warn(`${member} 일정 필터링 중 오류:`, filterError, schedule);
              return false;
            }
          }) || [];
          
          console.log(`${member} 필터링 결과:`, todaySchedules.length, '개');
          
          // 완료 상태 확인
          if (todaySchedules.length > 0) {
            try {
              const scheduleIds = todaySchedules.map(s => s.id).filter(id => id);
              if (scheduleIds.length === 0) {
                console.warn(`${member}: 유효한 일정 ID가 없음`);
                memberSchedules[member] = [];
                continue;
              }
              
              const completions = await this.getCompletionStatuses(scheduleIds, today, today);
              
              // 완료되지 않은 일정만 필터링하고, 완료 상태 정보 추가
              const completedIds = new Set(
                completions.filter(c => c.completed).map(c => c.schedule_id)
              );
              
              const schedulesWithCompletion = todaySchedules.map(schedule => ({
                ...schedule,
                completed: completedIds.has(schedule.id)
              }));
              
              memberSchedules[member] = schedulesWithCompletion;
              
              console.log(`${member} 최종 오늘 일정:`, schedulesWithCompletion.length, '개');
              console.log(`${member} 완료된 일정:`, schedulesWithCompletion.filter(s => s.completed).length, '개');
            } catch (completionError) {
              console.warn(`${member} 완료 상태 조회 중 오류:`, completionError);
              // 에러 시 완료 상태 없이 전체 일정 포함
              memberSchedules[member] = todaySchedules.map(schedule => ({
                ...schedule,
                completed: false
              }));
            }
          } else {
            memberSchedules[member] = [];
          }
        } catch (memberError) {
          console.error(`${member} 일정 처리 중 예외 발생:`, memberError);
          memberSchedules[member] = [];
        }
      }
      
      console.log('가족 구성원별 일정 조회 완료:', memberSchedules);
      return memberSchedules;
    } catch (error) {
      console.error('가족 구성원별 일정 조회 전체 오류:', error);
      return {};
    }
  }
}

// Storage functions for images
export const storageApi = {
  // Upload image - 권한 문제 해결을 위한 새로운 방식
  async uploadImage(file: File, path: string) {
    console.log('Storage API 업로드 시작:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      path: path
    });
    
    try {
      // 파일을 ArrayBuffer로 변환하여 업로드
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log('파일을 ArrayBuffer로 변환 완료, 크기:', uint8Array.length);
      
      const { data, error } = await supabase.storage
        .from('recipe-images')
        .upload(path, uint8Array, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
      
      if (error) {
        console.error('Storage API 업로드 실패:', error);
        throw error;
      }
      
      console.log('Storage API 업로드 성공:', data);
      return data;
      
    } catch (error) {
      console.error('Storage API 업로드 중 예외 발생:', error);
      throw error;
    }
  },

  // Get public URL - 권한 문제 해결을 위한 새로운 방식
  getPublicUrl(path: string) {
    try {
      // Supabase Storage에서 직접 public URL 생성
      const { data } = supabase.storage
        .from('recipe-images')
        .getPublicUrl(path);
      
      console.log('생성된 public URL:', data.publicUrl);
      
      // URL 유효성 검증
      if (!data.publicUrl || !data.publicUrl.includes('supabase.co')) {
        throw new Error('잘못된 public URL 생성');
      }
      
      return data.publicUrl;
      
    } catch (error) {
      console.error('Public URL 생성 실패:', error);
      
      // 대체 방법: 수동으로 URL 구성
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const manualUrl = `${supabaseUrl}/storage/v1/object/public/recipe-images/${path}`;
      
      console.log('수동 생성된 URL:', manualUrl);
      return manualUrl;
    }
  },

  // Delete image
  async deleteImage(path: string) {
    try {
      const { error } = await supabase.storage
        .from('recipe-images')
        .remove([path]);
      
      if (error) {
        console.error('이미지 삭제 실패:', error);
        throw error;
      }
      
      console.log('이미지 삭제 성공:', path);
    } catch (error) {
      console.error('이미지 삭제 중 예외 발생:', error);
      throw error;
    }
  }
} 