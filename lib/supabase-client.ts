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
        start_date: schedule.start_date || new Date().toISOString().split('T')[0],
        end_date: schedule.end_date || null,
        weekly_day: schedule.weekly_day || null,
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
  }
}

// Storage functions for images
export const storageApi = {
  // Upload image
  async uploadImage(file: File, path: string) {
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    return data
  },

  // Get public URL
  getPublicUrl(path: string) {
    const { data } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(path)
    
    return data.publicUrl
  },

  // Delete image
  async deleteImage(path: string) {
    const { error } = await supabase.storage
      .from('recipe-images')
      .remove([path])
    
    if (error) throw error
  }
} 