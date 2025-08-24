"use client";

import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Plus, Calendar as CalendarIcon, ChevronLeft, ChevronRight, List, Grid3X3, Edit, Trash2, CalendarDays, Clock, ChefHat } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addDays, subDays, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval as eachDayOfWeek, addWeeks, subWeeks, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { schedulesApi, Schedule, ScheduleCompletion, FAMILY_MEMBERS, FAMILY_MEMBER_LABELS, FAMILY_MEMBER_COLORS, FamilyMember, familyMealsApi, FamilyMeal, testSupabaseConnection } from "@/lib/supabase-client";
import { useRouter, usePathname } from "next/navigation";

export default function SchedulePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [completions, setCompletions] = useState<ScheduleCompletion[]>([]);
  const [familyMeals, setFamilyMeals] = useState<FamilyMeal[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('day');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // 강제 리렌더링을 위한 키
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<FamilyMember[]>([]); // 기본값은 아무것도 선택하지 않음 (전체 표시)
  const [sortBy, setSortBy] = useState<'created_desc' | 'created_asc' | 'start_date_asc' | 'start_date_desc' | 'title_asc' | 'frequency_asc'>('created_desc');
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    frequency: "daily" as Schedule['frequency'],
    start_time: format(new Date(), 'HH:mm'),
    end_time: format(new Date(new Date().getTime() + 60 * 60 * 1000), 'HH:mm'), // 현재 시간 + 1시간
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: "",
    weekly_day: undefined as number | undefined,
    monthly_day: undefined as number | undefined,
    custom_pattern: "",
    family_members: [] as FamilyMember[],
  });

  // URL 쿼리 파라미터 처리
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const dateParam = urlParams.get('date');
      const viewParam = urlParams.get('view');
      const memberParam = urlParams.get('member');
      
      if (dateParam) {
        const today = new Date();
        let targetDate = new Date();
        
        switch (dateParam) {
          case 'yesterday':
            targetDate = subDays(today, 1);
            break;
          case 'today':
            targetDate = today;
            break;
          case 'tomorrow':
            targetDate = addDays(today, 1);
            break;
          default:
            // 기본값은 오늘
            targetDate = today;
        }
        
        setCurrentDate(targetDate);
      }
      
      if (viewParam && (viewParam === 'month' || viewParam === 'week' || viewParam === 'day')) {
        setViewMode(viewParam);
        
        // 월별 뷰일 때 이번달로 설정
        if (viewParam === 'month') {
          setCurrentDate(new Date());
        }
      }

      // 가족 구성원 파라미터 처리
      if (memberParam && Object.values(FAMILY_MEMBERS).includes(memberParam as FamilyMember)) {
        setSelectedFamilyMembers([memberParam as FamilyMember]);
        console.log('URL에서 가족 구성원 설정:', memberParam);
      }
    }
  }, []);

  // 데이터 로드
  useEffect(() => {
    loadAllData();
  }, []);

  // currentDate 변경 시 완료 상태 다시 로드
  useEffect(() => {
    if (schedules && schedules.length > 0) {
      loadCompletions();
    }
  }, [currentDate, schedules]);

  const loadSchedules = async () => {
    try {
      console.log('=== loadSchedules 시작 ===');
      setLoading(true);
      
      console.log('schedulesApi.getAll() 호출...');
      const data = await schedulesApi.getAll();
      console.log('로드된 일정 데이터:', data);
      console.log('일정 개수:', data?.length || 0);
      
      // 데이터가 undefined인 경우 빈 배열로 설정
      setSchedules(data || []);
      console.log('schedules 상태 업데이트 완료');
      
    } catch (error) {
      console.error('=== loadSchedules 실패 ===');
      console.error('오류:', error);
      if (error instanceof Error) {
        console.error('오류 메시지:', error.message);
        console.error('오류 스택:', error.stack);
      }
      // 에러 발생 시 빈 배열로 설정
      setSchedules([]);
    } finally {
      setLoading(false);
      console.log('=== loadSchedules 완료 ===');
    }
  };

  // 완료 상태 로드 (최적화된 버전)
  const loadCompletions = async () => {
    try {
      console.log('=== 완료 상태 로드 시작 ===');
      
      // schedule_completions 테이블이 없을 수 있으므로 안전하게 처리
      if (!schedules || schedules.length === 0) {
        console.log('일정이 없어서 완료 상태 로드 건너뜀');
        setCompletions([]);
        return;
      }
      
      // 완료 상태 로드 시도
      console.log('완료 상태 로드 시작...');
      
      try {
        // 일괄 조회로 완료 상태 로드
        if (schedules.length > 0) {
          const start = startOfMonth(currentDate);
          const end = endOfMonth(currentDate);
          const startDate = format(start, 'yyyy-MM-dd');
          const endDate = format(end, 'yyyy-MM-dd');
          
          console.log('일괄 조회 시작:', { 
            startDate, 
            endDate, 
            scheduleCount: schedules.length 
          });
          
          const scheduleIds = schedules.map(s => s.id);
          const allCompletions = await schedulesApi.getCompletionStatuses(scheduleIds, startDate, endDate);
          
          setCompletions(allCompletions);
          console.log('일괄 완료 상태 로드 완료:', allCompletions.length, '개');
        } else {
          setCompletions([]);
          console.log('일정이 없어서 완료 상태 로드 건너뜀');
        }
      } catch (error) {
        console.log('완료 상태 로드 실패, 빈 배열로 설정:', error);
        setCompletions([]);
      }
      
    } catch (error) {
      console.error('=== 완료 상태 로드 실패 ===');
      console.error('오류:', error);
      
      // 406 오류나 테이블이 없는 경우는 빈 배열로 설정
      if (error instanceof Error && (
        error.message.includes('406') || 
        error.message.includes('Not Acceptable') ||
        error.message.includes('does not exist')
      )) {
        console.log('schedule_completions 테이블이 없어서 빈 배열로 설정');
        setCompletions([]);
        return;
      }
      
      // 다른 오류는 그대로 표시
      throw error;
    }
  };

  // 데이터 로드 (일정만, 406 오류 방지)
  const loadFamilyMeals = async () => {
    try {
      let startDate: string, endDate: string;
      
      if (viewMode === 'month') {
        const start = startOfMonth(currentDate);
        const end = endOfMonth(currentDate);
        startDate = format(start, 'yyyy-MM-dd');
        endDate = format(end, 'yyyy-MM-dd');
      } else if (viewMode === 'week') {
        const start = startOfWeek(currentDate, { weekStartsOn: 1 });
        const end = endOfWeek(currentDate, { weekStartsOn: 1 });
        startDate = format(start, 'yyyy-MM-dd');
        endDate = format(end, 'yyyy-MM-dd');
      } else {
        // 일별 뷰
        startDate = format(currentDate, 'yyyy-MM-dd');
        endDate = format(currentDate, 'yyyy-MM-dd');
      }
      
      console.log('가족식단 로드 시작:', { startDate, endDate, currentDate: currentDate.toISOString() });
      
      // Supabase 연결 테스트 먼저 실행
      console.log('Supabase 연결 테스트 시작...');
      const connectionTest = await testSupabaseConnection();
      console.log('Supabase 연결 테스트 결과:', connectionTest);
      
      if (!connectionTest) {
        console.error('Supabase 연결 실패 - 가족식단 로드 중단');
        setFamilyMeals([]);
        return;
      }
      
      const meals = await familyMealsApi.getByMonth(
        new Date(startDate).getFullYear(),
        new Date(startDate).getMonth() + 1
      );
      
      console.log('가족식단 API 응답:', { mealsCount: meals?.length || 0, meals });
      
      // 현재 기간에 해당하는 식단만 필터링
      const filteredMeals = meals.filter(meal => 
        meal.date >= startDate && meal.date <= endDate
      );
      
      console.log('필터링된 가족식단:', { filteredCount: filteredMeals.length, filteredMeals });
      
      setFamilyMeals(filteredMeals);
    } catch (error) {
      console.error('=== 가족식단 로드 실패 ===');
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
      
      // 에러 객체의 모든 속성을 순회하며 로깅
      console.error('에러 객체 속성들:');
      if (error && typeof error === 'object') {
        for (const key in error) {
          try {
            const value = (error as Record<string, unknown>)[key];
            console.error(`  ${key}:`, value);
          } catch {
            console.error(`  ${key}: [접근 불가]`);
          }
        }
        
        // Object.getOwnPropertyNames를 사용하여 모든 속성 확인
        try {
          const allProps = Object.getOwnPropertyNames(error);
          console.error('Object.getOwnPropertyNames 결과:', allProps);
          
          allProps.forEach(prop => {
            try {
              const value = (error as Record<string, unknown>)[prop];
              console.error(`  ${prop}:`, value);
            } catch {
              console.error(`  ${prop}: [접근 불가]`);
            }
          });
        } catch {
          console.error('Object.getOwnPropertyNames 실패');
        }
      } else {
        console.error('에러가 객체가 아님:', error);
      }
      
      setFamilyMeals([]);
    }
  };

  // currentDate 변경 시 가족식단 데이터도 로드
  useEffect(() => {
    loadFamilyMeals();
  }, [currentDate, viewMode]);

  const loadAllData = async () => {
    console.log('=== loadAllData 시작 ===');
    try {
      console.log('1. 일정 로드 시작...');
      await loadSchedules();
      console.log('2. 일정 로드 완료');
      
      // 완료 상태 로드 (406 오류 방지)
      console.log('3. 완료 상태 로드 시작...');
      try {
        await loadCompletions();
      } catch (error) {
        console.log('완료 상태 로드 실패, 빈 배열로 설정:', error);
        setCompletions([]);
      }
      
      // 가족식단 로드
      console.log('4. 가족식단 로드 시작...');
      await loadFamilyMeals();
      console.log('5. 가족식단 로드 완료');
      
      console.log('6. loadAllData 완료');
    } catch (error) {
      console.error('loadAllData 오류:', error);
      // 에러 발생 시 기본값 설정
      setSchedules([]);
      setCompletions([]);
      setFamilyMeals([]);
    }
  };



  const resetForm = (selectedDate?: Date) => {
    const startDate = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
    // 종료일을 시작일로부터 3개월 후로 설정
    const endDate = new Date(selectedDate || new Date());
    endDate.setMonth(endDate.getMonth() + 3);
    
    setFormData({
      title: "",
      description: "",
      frequency: "daily",
      start_time: format(new Date(), 'HH:mm'),
      end_time: format(new Date(new Date().getTime() + 60 * 60 * 1000), 'HH:mm'), // 현재 시간 + 1시간
      start_date: startDate,
      end_date: format(endDate, 'yyyy-MM-dd'), // 시작일로부터 3개월 후
      weekly_day: undefined,
      monthly_day: undefined,
      custom_pattern: "",
      family_members: [],
    });
    setSelectedFamilyMembers([]);
    setEditingSchedule(null);
  };

  // 우측상단 버튼 클릭 시 오늘 날짜로 폼 초기화
  const handleAddNewSchedule = () => {
    resetForm(new Date()); // 오늘 날짜로 설정 (종료일은 자동으로 3개월 후)
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;

    try {
      console.log('=== 일정 저장 시작 ===');
      console.log('폼 데이터:', formData);
      console.log('weekly_day 값:', formData.weekly_day, '타입:', typeof formData.weekly_day);
      
      const scheduleData = {
        title: formData.title,
        description: formData.description || undefined,
        frequency: formData.frequency,
        start_time: formData.start_time,
        end_time: formData.end_time,
        start_date: formData.start_date,
        end_date: formData.end_date || undefined,
        weekly_day: formData.weekly_day !== undefined ? formData.weekly_day : undefined,
        monthly_day: formData.monthly_day || undefined,
        custom_pattern: formData.custom_pattern || undefined,
        family_members: formData.family_members,
      };
      
      console.log('저장할 데이터:', scheduleData);
      console.log('weekly_day 최종값:', scheduleData.weekly_day);

      if (editingSchedule) {
        console.log('기존 일정 수정:', editingSchedule.id);
        const updatedSchedule = await schedulesApi.update(editingSchedule.id, scheduleData);
        console.log('수정 결과:', updatedSchedule);
      } else {
        console.log('새 일정 생성');
        const createdSchedule = await schedulesApi.create(scheduleData);
        console.log('생성 결과:', createdSchedule);
      }
      
      console.log('=== 데이터 다시 로드 시작 ===');
      // 일정과 완료 상태 모두 다시 로드
      await loadAllData();
      console.log('=== 데이터 다시 로드 완료 ===');
      
      // 로드된 데이터 확인
      console.log('로드 후 schedules 상태:', schedules);
      console.log('로드 후 schedules 길이:', schedules.length);
      
      // 안전한 리렌더링을 위한 키 업데이트
      setRefreshKey(prev => prev + 1);
      
      resetForm();
      setIsDialogOpen(false);
      
      console.log('=== 일정 저장 완료 ===');
      
    } catch (error) {
      console.error('=== 일정 저장 실패 ===');
      console.error('오류:', error);
      
      if (error instanceof Error) {
        alert(`저장에 실패했습니다: ${error.message}`);
      } else {
        alert('저장에 실패했습니다.');
      }
    }
  };

  const handleEdit = (schedule: Schedule) => {
    console.log('=== 일정 수정 시작 ===');
    console.log('수정할 일정:', schedule);
    console.log('weekly_day 값:', schedule.weekly_day, '타입:', typeof schedule.weekly_day);
    
    setEditingSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || "",
      frequency: schedule.frequency,
      start_time: schedule.start_time || format(new Date(), 'HH:mm'),
      end_time: schedule.end_time || format(new Date(new Date().getTime() + 60 * 60 * 1000), 'HH:mm'),
      start_date: schedule.start_date,
      end_date: schedule.end_date || "",
      weekly_day: schedule.weekly_day !== null && schedule.weekly_day !== undefined ? schedule.weekly_day : undefined,
      monthly_day: schedule.monthly_day !== null && schedule.monthly_day !== undefined ? schedule.monthly_day : undefined,
      custom_pattern: schedule.custom_pattern || "",
      family_members: schedule.family_members || ['family'],
    });
    
    console.log('설정된 formData:', {
      frequency: schedule.frequency,
      weekly_day: schedule.weekly_day !== null && schedule.weekly_day !== undefined ? schedule.weekly_day : undefined
    });
    
    setSelectedFamilyMembers(schedule.family_members || ['family']);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await schedulesApi.delete(id);
      await loadAllData();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleToggleComplete = async (scheduleId: string, date: Date) => {
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      console.log('토글 시작:', { scheduleId, dateString, date });
      
      // 입력값 검증
      if (!scheduleId || !dateString) {
        throw new Error('필수 파라미터가 누락되었습니다.');
      }
      
      const existingCompletion = completions.find(
        c => c.schedule_id === scheduleId && c.completion_date === dateString
      );
      
      const currentCompleted = existingCompletion?.completed ?? false;
      const newCompleted = !currentCompleted;
      
      console.log('현재 상태:', { 
        currentCompleted, 
        newCompleted, 
        existingCompletion,
        completionsCount: completions.length 
      });
      
      // API 호출
      console.log('API 호출 시작...');
      const result = await schedulesApi.toggleCompletion(scheduleId, dateString, newCompleted);
      console.log('API 호출 결과:', result);
      
      // 로컬 상태 즉시 업데이트 (UI 반응성 향상)
      if (existingCompletion) {
        console.log('기존 완료 기록 업데이트:', existingCompletion.id);
        setCompletions(prev => (prev || []).map(c => 
          c.id === existingCompletion.id 
            ? { ...c, completed: newCompleted }
            : c
        ));
      } else {
        console.log('새 완료 기록 추가');
        const newCompletion: ScheduleCompletion = {
          id: result.id || Date.now().toString(), // API 결과의 ID 사용
          schedule_id: scheduleId,
          completion_date: dateString,
          completed: newCompleted,
          created_at: new Date().toISOString(),
        };
        setCompletions(prev => [...(prev || []), newCompletion]);
      }
      
      console.log('완료 상태 변경 성공:', newCompleted);
      
      // 백그라운드에서 DB 상태 동기화 (UI는 즉시 반영됨)
      console.log('백그라운드에서 DB 상태 동기화 시작...');
      setTimeout(() => loadCompletions(), 1000);
      
    } catch (error) {
      console.error('완료 상태 변경 실패:', error);
      
      // 테이블이 없는 경우 특별 처리
      if (error instanceof Error && (
        error.message.includes('does not exist') || 
        error.message.includes('406') ||
        error.message.includes('Not Acceptable')
      )) {
        alert('일정 완료 기능을 사용하려면 데이터베이스에 schedule_completions 테이블을 생성해야 합니다.\n\nSupabase 대시보드에서 다음 SQL을 실행하세요:\n\nCREATE TABLE schedule_completions (\n  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,\n  schedule_id UUID REFERENCES schedules(id),\n  completion_date DATE NOT NULL,\n  completed BOOLEAN DEFAULT true,\n  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n);');
        return;
      }
      
      // 상세한 오류 정보 출력
      if (error instanceof Error) {
        console.error('오류 타입: Error');
        console.error('오류 메시지:', error.message);
        console.error('오류 스택:', error.stack);
        console.error('오류 이름:', error.name);
        
        // 사용자에게 오류 알림
        alert(`완료 상태 변경에 실패했습니다: ${error.message}`);
      } else {
        console.error('오류 타입: Unknown');
        console.error('오류 객체:', error);
        console.error('오류 타입:', typeof error);
        
        // 사용자에게 오류 알림
        alert('완료 상태 변경에 실패했습니다. 콘솔을 확인해주세요.');
      }
      
      // 추가 디버깅 정보
      console.error('디버깅 정보:', {
        scheduleId,
        date: date.toISOString(),
        dateString: format(date, 'yyyy-MM-dd'),
        completionsLength: completions.length,
        schedulesLength: schedules.length
      });
    }
  };

  const getSchedulesForDate = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    
    if (!schedules || schedules.length === 0) {
      return [];
    }
    
    // 먼저 선택된 가족 구성원에 따라 일정을 필터링
    let availableSchedules = schedules;
    
    if (selectedFamilyMembers.includes('family')) {
      // 가족이 선택된 경우: family로 등록된 일정 + 선택된 개별 구성원의 일정 모두 병합해서 표시
      const otherMembers: FamilyMember[] = selectedFamilyMembers.filter(m => m !== 'family');
      
      availableSchedules = schedules.filter(schedule => {
        if (!schedule.family_members || !Array.isArray(schedule.family_members)) {
          return false;
        }
        
        // family로 등록된 일정이거나 선택된 개별 구성원의 일정인 경우 모두 포함
        const isFamilyMatch = schedule.family_members.includes('family' as FamilyMember);
        const isOtherMemberMatch = otherMembers.length > 0 ? 
          schedule.family_members.some((member: FamilyMember) => otherMembers.includes(member)) : false;
        
        return isFamilyMatch || isOtherMemberMatch;
      });
    } else if (selectedFamilyMembers.length > 0) {
      // 개별 구성원만 선택된 경우
      availableSchedules = schedules.filter(schedule => {
        if (!schedule.family_members || !Array.isArray(schedule.family_members)) {
          return false;
        }
        return schedule.family_members.some(member => selectedFamilyMembers.includes(member));
      });
    } else {
      // 아무것도 선택되지 않은 경우: 모든 일정 표시 (기본값)
      availableSchedules = schedules;
    }
    
    const filteredSchedules = availableSchedules.filter(schedule => {
      const start = new Date(schedule.start_date);
      const end = schedule.end_date ? new Date(schedule.end_date) : new Date(2100, 0, 1);
      
      // 날짜 비교를 위해 시간 정보 제거
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      
      if (checkDate < startDate || checkDate > endDate) {
        return false;
      }
      
      let shouldInclude = false;
      
      switch (schedule.frequency) {
        case 'daily':
          shouldInclude = true;
          break;
        case 'weekly':
          if (schedule.weekly_day !== null && schedule.weekly_day !== undefined) {
            // weekly_day는 0(일요일)~6(토요일) 형식으로 저장됨
            const currentDay = date.getDay(); // 0(일요일) ~ 6(토요일)
            const scheduleDay = schedule.weekly_day;
            
            console.log('주간 패턴 계산:', {
              scheduleTitle: schedule.title,
              scheduleWeeklyDay: schedule.weekly_day,
              currentDate: date.toISOString().split('T')[0],
              currentDay: currentDay,
              scheduleDay: scheduleDay,
              shouldInclude: currentDay === scheduleDay
            });
            
            shouldInclude = currentDay === scheduleDay;
          } else {
            // 기존 로직 (주차 기반) - 일요일 기준으로 수정
            const weekStart = startOfWeek(start, { weekStartsOn: 0 }); // 일요일 기준
            const currentWeekStart = startOfWeek(date, { weekStartsOn: 0 }); // 일요일 기준
            const weekDiff = Math.floor((currentWeekStart.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
            shouldInclude = weekDiff >= 0 && weekDiff % 1 === 0;
          }
          break;
        case 'monthly':
          if (schedule.monthly_day !== null && schedule.monthly_day !== undefined) {
            shouldInclude = date.getDate() === schedule.monthly_day;
          } else {
            // 기존 로직 (시작일 기준)
            shouldInclude = date.getDate() === start.getDate();
          }
          break;
        case 'custom':
          // 패턴 처리
          if (schedule.custom_pattern) {
            try {
              // custom_pattern이 JSON 문자열인 경우 파싱
              let pattern;
              if (typeof schedule.custom_pattern === 'string') {
                pattern = JSON.parse(schedule.custom_pattern);
              } else {
                pattern = schedule.custom_pattern;
              }
              
              // 패턴에 따른 처리
              if (pattern.type === 'interval') {
                // 간격 기반 (예: 3일마다)
                const daysDiff = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
                shouldInclude = daysDiff >= 0 && daysDiff % pattern.interval === 0;
              } else if (pattern.type === 'specific_days') {
                // 특정 요일들 (예: 월,수,금)
                const currentDay = date.getDay();
                shouldInclude = pattern.days && Array.isArray(pattern.days) && pattern.days.includes(currentDay);
              } else if (pattern.type === 'weekday') {
                // 평일만 (월~금)
                const currentDay = date.getDay();
                shouldInclude = currentDay >= 1 && currentDay <= 5;
              } else if (pattern.type === 'weekend') {
                // 주말만 (토,일)
                const currentDay = date.getDay();
                shouldInclude = currentDay === 0 || currentDay === 6;
              } else {
                // 기본값: 시작일부터 매일
                shouldInclude = true;
              }
            } catch (error) {
              console.error('패턴 파싱 오류:', error);
              // 파싱 실패 시 기본값으로 처리
              shouldInclude = true;
            }
          } else {
            // custom_pattern이 없으면 시작일부터 매일
            shouldInclude = true;
          }
          break;
        default:
          shouldInclude = false;
      }
      
      return shouldInclude;
    });
    
    return filteredSchedules;
  };

  const isScheduleCompleted = (scheduleId: string, date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    if (!completions || completions.length === 0) {
      return false;
    }
    
    const completion = completions.find(
      c => c.schedule_id === scheduleId && c.completion_date === dateString
    );
    
    return completion?.completed || false;
  };

  const getMonthDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // 일요일부터 시작
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfWeek({ start, end });
  };

  const getFrequencyLabel = (frequency: Schedule['frequency']) => {
    switch (frequency) {
      case 'daily': return '매일';
      case 'weekly': return '매주';
      case 'monthly': return '매월';
      case 'custom': return '패턴';
      default: return frequency;
    }
  };

  // 캘린더 표시용 간단한 라벨
  const getFrequencyShortLabel = (frequency: Schedule['frequency']) => {
    switch (frequency) {
      case 'daily': return 'D';
      case 'weekly': return 'W';
      case 'monthly': return 'M';
      case 'custom': return 'P';
      default: return frequency;
    }
  };

  // 패턴 상세 정보 생성
  const getPatternDetail = (schedule: Schedule) => {
    if (schedule.frequency === 'custom' && schedule.custom_pattern) {
      try {
        const pattern = JSON.parse(schedule.custom_pattern);
        switch (pattern.type) {
          case 'daily':
            return '매일';
          case 'interval':
            return `${pattern.interval}일마다`;
          case 'specific_days':
            const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
            const selectedDays = pattern.days && Array.isArray(pattern.days) 
              ? pattern.days.map((day: number) => dayLabels[day]).join(', ') 
              : '';
            return `매주 ${selectedDays}`;
          case 'weekday':
            return '평일만 (월~금)';
          case 'weekend':
            return '주말만 (토,일)';
          default:
            return '패턴';
        }
      } catch (error) {
        return '패턴';
      }
    } else if (schedule.frequency === 'weekly' && schedule.weekly_day !== null && schedule.weekly_day !== undefined) {
      const dayLabels = ['일', '월', '화', '수', '목', '금', '토'];
      return `매주 ${dayLabels[schedule.weekly_day]}`;
    } else if (schedule.frequency === 'monthly' && schedule.monthly_day !== null && schedule.monthly_day !== undefined) {
      return `매월 ${schedule.monthly_day}일`;
    } else {
      return getFrequencyLabel(schedule.frequency);
    }
  };

  const getFrequencyColor = (frequency: Schedule['frequency']) => {
    switch (frequency) {
      case 'daily': return 'bg-blue-100 text-blue-800';
      case 'weekly': return 'bg-green-100 text-green-800';
      case 'monthly': return 'bg-purple-100 text-purple-800';
      case 'custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWeeklyDayLabel = (day: number) => {
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[day] || '알 수 없음';
  };

  const getMonthlyDayLabel = (day: number) => {
    return `${day}일`;
  };

  // 시간을 HH:MM 형식으로 포맷팅하는 함수
  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    // HH:MM:SS 형식에서 HH:MM만 추출
    return timeString.substring(0, 5);
  };

  const handleFrequencyChange = (frequency: Schedule['frequency']) => {
    setFormData(prev => ({
      ...prev,
      frequency,
      weekly_day: undefined,
      monthly_day: undefined,
      custom_pattern: "",
    }));
  };

  const handleWeekNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(addWeeks(currentDate, 1));
    }
  };

  const handleDayNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(subDays(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  // 가족 구성원 필터링된 일정 가져오기
  const getFilteredSchedules = () => {
    if (!schedules || schedules.length === 0) {
      return [];
    }
    
    let filteredSchedules;
    
    if (selectedFamilyMembers.includes('family')) {
      // 가족이 선택된 경우: family로 등록된 일정 + 선택된 개별 구성원의 일정 모두 병합해서 표시
      const otherMembers: FamilyMember[] = selectedFamilyMembers.filter(m => m !== 'family');
      console.log('가족 선택 (개별 구성원과 함께):', otherMembers);
      
      // 모든 조건에 맞는 일정을 수집
      const allMatchingSchedules: Schedule[] = [];
      
      schedules.forEach(schedule => {
        if (!schedule.family_members || !Array.isArray(schedule.family_members)) {
          return;
        }
        
        // family로 등록된 일정이거나 선택된 개별 구성원의 일정인 경우 모두 포함
        const isFamilyMatch = schedule.family_members.includes('family' as FamilyMember);
        const isOtherMemberMatch = otherMembers.length > 0 ? 
          schedule.family_members.some((member: FamilyMember) => otherMembers.includes(member)) : false;
        
        // 가족이 선택되었으면 family로 등록된 일정은 항상 포함
        // 추가로 개별 구성원이 선택되었다면 해당 구성원의 일정도 포함
        if (isFamilyMatch || isOtherMemberMatch) {
          allMatchingSchedules.push(schedule);
          console.log('일정 포함:', schedule.title, {
            family_members: schedule.family_members,
            isFamilyMatch,
            isOtherMemberMatch,
            reason: isFamilyMatch && isOtherMemberMatch ? '가족+개별구성원' : 
                   isFamilyMatch ? '가족' : '개별구성원'
          });
        }
      });
      
      // 중복 제거 (같은 일정이 여러 조건에 맞을 수 있음)
      const uniqueSchedules = allMatchingSchedules.filter((schedule, index, self) => 
        index === self.findIndex(s => s.id === schedule.id)
      );
      
      filteredSchedules = uniqueSchedules;
      console.log('가족 선택 시', filteredSchedules.length, '개 일정 (family + 선택된 구성원 일정 병합)');
    } else if (selectedFamilyMembers.length > 0) {
      // 개별 구성원만 선택된 경우
      filteredSchedules = schedules.filter(schedule => {
        if (!schedule.family_members || !Array.isArray(schedule.family_members)) {
          console.log('일정 제외 (family_members 없음):', schedule.title);
          return false; // family_members가 없으면 제외
        }
        
        // 선택된 구성원 중 하나라도 일정의 대상에 포함되어 있는지 확인
        const isIncluded = schedule.family_members.some(member => selectedFamilyMembers.includes(member));
        if (isIncluded) {
          console.log('일정 포함:', schedule.title, '대상:', schedule.family_members);
        } else {
          console.log('일정 제외:', schedule.title, '대상:', schedule.family_members, '선택된 구성원:', selectedFamilyMembers);
        }
        return isIncluded;
      });
      
      console.log('필터링 결과:', selectedFamilyMembers, '선택 시', filteredSchedules.length, '개 일정');
    } else {
      // 아무것도 선택되지 않은 경우: 모든 일정 표시 (기본값)
      console.log('아무것도 선택되지 않음: 모든 일정 표시 (기본값)');
      filteredSchedules = [...schedules];
    }
    
    // 정렬 적용
    return sortSchedules(filteredSchedules);
  };

  // 일정 정렬 함수
  const sortSchedules = (schedulesToSort: Schedule[]) => {
    const sortedSchedules = [...schedulesToSort];
    
    switch (sortBy) {
      case 'created_desc':
        return sortedSchedules.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'created_asc':
        return sortedSchedules.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'start_date_asc':
        return sortedSchedules.sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
      case 'start_date_desc':
        return sortedSchedules.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
      case 'title_asc':
        return sortedSchedules.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
      case 'frequency_asc':
        return sortedSchedules.sort((a, b) => a.frequency.localeCompare(b.frequency, 'ko'));
      default:
        return sortedSchedules;
    }
  };

  // 가족식단 정렬 함수 (날짜 - 아침, 점심, 저녁 순서)
  const sortFamilyMeals = (mealsToSort: FamilyMeal[]) => {
    const sortedMeals = [...mealsToSort];
    
    return sortedMeals.sort((a, b) => {
      // 먼저 날짜로 정렬
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // 같은 날짜인 경우 아침, 점심, 저녁 순서로 정렬
      const mealOrder = { breakfast: 1, lunch: 2, dinner: 3 };
      
      // 아침이 있으면 첫 번째
      if (a.breakfast && !b.breakfast) return -1;
      if (!a.breakfast && b.breakfast) return 1;
      
      // 점심이 있으면 두 번째
      if (a.lunch && !b.lunch) return -1;
      if (!a.lunch && b.lunch) return 1;
      
      // 저녁이 있으면 세 번째
      if (a.dinner && !b.dinner) return -1;
      if (!a.dinner && b.dinner) return 1;
      
      return 0;
    });
  };

  // 현재 기간의 일정 가져오기
  const getCurrentPeriodSchedules = () => {
    if (!schedules || schedules.length === 0) return [];
    
    const currentPeriodSchedules = [];
    
    if (viewMode === 'month') {
      // 이번 달의 모든 날짜에 대해 일정 확인
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const days = eachDayOfInterval({ start, end });
      
      const monthSchedules = new Set<Schedule>();
      days.forEach(day => {
        const daySchedules = getSchedulesForDate(day);
        daySchedules.forEach(schedule => monthSchedules.add(schedule));
      });
      
      currentPeriodSchedules.push(...Array.from(monthSchedules));
    } else if (viewMode === 'week') {
      // 이번 주의 모든 날짜에 대해 일정 확인
      const weekDays = getWeekDays();
      
      const weekSchedules = new Set<Schedule>();
      weekDays.forEach(day => {
        const daySchedules = getSchedulesForDate(day);
        daySchedules.forEach(schedule => weekSchedules.add(schedule));
      });
      
      currentPeriodSchedules.push(...Array.from(weekSchedules));
    } else {
      // 오늘의 일정
      currentPeriodSchedules.push(...getSchedulesForDate(currentDate));
    }
    
    return currentPeriodSchedules;
  };

  // 현재 기간 제목 가져오기
  const getCurrentPeriodTitle = () => {
    if (viewMode === 'month') {
      return `이번달의 일정 (${format(currentDate, 'yyyy년 M월', { locale: ko })})`;
    } else if (viewMode === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `이번주의 일정 (${format(weekStart, 'M월 d일')} - ${format(weekEnd, 'M월 d일')})`;
    } else {
      return `오늘의 일정 (${format(currentDate, 'M월 d일 (EEEE)', { locale: ko })})`;
    }
  };

  // 가족 구성원 토글 핸들러
  const handleFamilyMemberToggle = (member: FamilyMember) => {
    if (member === 'family') {
      // 가족 선택 시 모든 구성원의 일정을 병합해서 표시
      const isCurrentlySelected = selectedFamilyMembers.includes('family');
      if (isCurrentlySelected) {
        // 가족 선택 해제
        const newMembers = selectedFamilyMembers.filter(m => m !== 'family');
        setSelectedFamilyMembers(newMembers);
        setFormData(prev => ({ ...prev, family_members: newMembers }));
      } else {
        // 가족 선택 추가
        const newSelectedMembers: FamilyMember[] = [...selectedFamilyMembers, 'family' as FamilyMember];
        setSelectedFamilyMembers(newSelectedMembers);
        setFormData(prev => ({ ...prev, family_members: newSelectedMembers }));
      }
    } else {
      // 개별 구성원 선택 시
      const isCurrentlySelected = selectedFamilyMembers.includes(member);
      if (isCurrentlySelected) {
        // 현재 선택된 구성원 해제
        const newMembers = selectedFamilyMembers.filter(m => m !== member);
        setSelectedFamilyMembers(newMembers);
        setFormData(prev => ({ ...prev, family_members: newMembers }));
      } else {
        // 새로운 구성원 추가
        const newSelectedMembers = [...selectedFamilyMembers, member];
        setSelectedFamilyMembers(newSelectedMembers);
        setFormData(prev => ({ ...prev, family_members: newSelectedMembers }));
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 md:pb-0 md:pt-16">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">로딩 중...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* 가족 구성원 필터 */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{
                selectedFamilyMembers.length > 0
                  ? selectedFamilyMembers.map(member => FAMILY_MEMBER_LABELS[member]).join(', ')
                  : '모두'
              }의 일정</h3>
            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {/* 가족 구성원 버튼들 - 대시보드와 동일한 스타일 */}
              <button
                onClick={() => handleFamilyMemberToggle(FAMILY_MEMBERS.FAMILY)}
                className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                  selectedFamilyMembers.includes(FAMILY_MEMBERS.FAMILY) 
                    ? 'bg-orange-100 border-orange-300 shadow-lg scale-105' 
                    : 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg md:text-2xl mb-1 md:mb-2">👨‍👩‍👧‍👦</div>
                  <div className="font-semibold text-orange-600 text-xs md:text-sm">가족</div>
                </div>
              </button>

              <button
                onClick={() => handleFamilyMemberToggle(FAMILY_MEMBERS.MOM)}
                className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                  selectedFamilyMembers.includes(FAMILY_MEMBERS.MOM) 
                    ? 'bg-pink-100 border-pink-300 shadow-lg scale-105' 
                    : 'bg-pink-50 border-pink-200 hover:bg-pink-100 hover:border-pink-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg md:text-2xl mb-1 md:mb-2">👩</div>
                  <div className="font-semibold text-pink-600 text-xs md:text-sm">엄마</div>
                </div>
              </button>

              <button
                onClick={() => handleFamilyMemberToggle(FAMILY_MEMBERS.SEIN)}
                className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                  selectedFamilyMembers.includes(FAMILY_MEMBERS.SEIN) 
                    ? 'bg-blue-100 border-blue-300 shadow-lg scale-105' 
                    : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg md:text-2xl mb-1 md:mb-2">👨</div>
                  <div className="font-semibold text-blue-600 text-xs md:text-sm">세인</div>
                </div>
              </button>

              <button
                onClick={() => handleFamilyMemberToggle(FAMILY_MEMBERS.SEHA)}
                className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                  selectedFamilyMembers.includes(FAMILY_MEMBERS.SEHA) 
                    ? 'bg-green-100 border-green-300 shadow-lg scale-105' 
                    : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg md:text-2xl mb-1 md:mb-2">👦</div>
                  <div className="font-semibold text-green-600 text-xs md:text-sm">세하</div>
                </div>
              </button>

              <button
                onClick={() => handleFamilyMemberToggle(FAMILY_MEMBERS.DAD)}
                className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                  selectedFamilyMembers.includes(FAMILY_MEMBERS.DAD) 
                    ? 'bg-red-100 border-red-300 shadow-lg scale-105' 
                    : 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-lg md:text-2xl mb-1 md:mb-2">👨</div>
                  <div className="font-semibold text-red-600 text-xs md:text-sm">아빠</div>
                </div>
              </button>
            </div> 
          </div>

          {/* 뷰 모드 선택과 액션 버튼들 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-2">
              <Button
                variant={viewMode === 'day' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                <List className="mr-2 h-4 w-4" />
                일별
              </Button>
              <Button
                variant={viewMode === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                주별
              </Button>
              <Button
                variant={viewMode === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                <Grid3X3 className="mr-2 h-4 w-4" />
                월별
              </Button>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={loadAllData}
                className="p-2 h-9 w-9 bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 transition-all duration-200"
                title="새로고침"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={handleAddNewSchedule}
                    size="sm"
                    className="p-2 h-9 w-9 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                    title="일정 추가"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingSchedule ? "일정 수정" : "새 일정 추가"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        일정명
                      </label>
                      <Input
                        placeholder="일정명을 입력하세요"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        설명
                      </label>
                      <Textarea
                        placeholder="일정에 대한 설명을 입력하세요 (선택사항)"
                        value={formData.description}
                        onChange={(e) => setFormData({...formData, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    {/* 가족 구성원 선택 */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        대상 구성원
                      </label>
                      <div className="grid grid-cols-5 gap-2 md:gap-3">
                        {/* 가족 구성원 버튼들 - 대시보드와 동일한 스타일 */}
                        <button
                          type="button"
                          onClick={() => {
                            const isSelected = formData.family_members.includes(FAMILY_MEMBERS.FAMILY);
                            setFormData(prev => ({ 
                              ...prev, 
                              family_members: isSelected ? [] : ['family'] 
                            }));
                          }}
                          className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                            formData.family_members.includes(FAMILY_MEMBERS.FAMILY) 
                              ? 'bg-orange-100 border-orange-300 shadow-lg scale-105' 
                              : 'bg-orange-50 border-orange-200 hover:bg-orange-100 hover:border-orange-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-lg md:text-2xl mb-1 md:mb-2">👨‍👩‍👧‍👦</div>
                            <div className="font-semibold text-orange-600 text-xs md:text-sm">가족</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const isSelected = formData.family_members.includes(FAMILY_MEMBERS.MOM);
                            if (isSelected) {
                              const newMembers = formData.family_members.filter(m => m !== FAMILY_MEMBERS.MOM);
                              setFormData(prev => ({ 
                                ...prev, 
                                family_members: newMembers 
                              }));
                            } else {
                              const newMembers = formData.family_members.filter(m => m !== 'family');
                              setFormData(prev => ({ 
                                ...prev, 
                                family_members: [...newMembers, FAMILY_MEMBERS.MOM] 
                              }));
                            }
                          }}
                          className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                            formData.family_members.includes(FAMILY_MEMBERS.MOM) 
                              ? 'bg-pink-100 border-pink-300 shadow-lg scale-105' 
                              : 'bg-pink-50 border-pink-200 hover:bg-pink-100 hover:border-pink-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-lg md:text-2xl mb-1 md:mb-2">👩</div>
                            <div className="font-semibold text-pink-600 text-xs md:text-sm">엄마</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const isSelected = formData.family_members.includes(FAMILY_MEMBERS.SEIN);
                            if (isSelected) {
                              const newMembers = formData.family_members.filter(m => m !== FAMILY_MEMBERS.SEIN);
                              setFormData(prev => ({ 
                                ...prev, 
                                family_members: newMembers 
                              }));
                            } else {
                              const newMembers = formData.family_members.filter(m => m !== 'family');
                              setFormData(prev => ({ 
                                ...prev, 
                                family_members: [...newMembers, FAMILY_MEMBERS.SEIN] 
                              }));
                            }
                          }}
                          className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                            formData.family_members.includes(FAMILY_MEMBERS.SEIN) 
                              ? 'bg-blue-100 border-blue-300 shadow-lg scale-105' 
                              : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-lg md:text-2xl mb-1 md:mb-2">👨</div>
                            <div className="font-semibold text-blue-600 text-xs md:text-sm">세인</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const isSelected = formData.family_members.includes(FAMILY_MEMBERS.SEHA);
                            if (isSelected) {
                              const newMembers = formData.family_members.filter(m => m !== FAMILY_MEMBERS.SEHA);
                              setFormData(prev => ({ 
                                ...prev, 
                                family_members: newMembers 
                              }));
                            } else {
                              const newMembers = formData.family_members.filter(m => m !== 'family');
                              setFormData(prev => ({ 
                                ...prev, 
                                family_members: [...newMembers, FAMILY_MEMBERS.SEHA] 
                              }));
                            }
                          }}
                          className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                            formData.family_members.includes(FAMILY_MEMBERS.SEHA) 
                              ? 'bg-green-100 border-green-300 shadow-lg scale-105' 
                              : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-lg md:text-2xl mb-1 md:mb-2">👦</div>
                            <div className="font-semibold text-green-600 text-xs md:text-sm">세하</div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const isSelected = formData.family_members.includes(FAMILY_MEMBERS.DAD);
                            if (isSelected) {
                              const newMembers = formData.family_members.filter(m => m !== FAMILY_MEMBERS.DAD);
                              setFormData(prev => ({ 
                                ...prev, 
                                family_members: newMembers 
                              }));
                            } else {
                              const newMembers = formData.family_members.filter(m => m !== 'family');
                              setFormData(prev => ({ 
                                ...prev, 
                                family_members: [...newMembers, FAMILY_MEMBERS.DAD] 
                              }));
                            }
                          }}
                          className={`p-2 md:p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:scale-105 ${
                            formData.family_members.includes(FAMILY_MEMBERS.DAD) 
                              ? 'bg-red-100 border-red-300 shadow-lg scale-105' 
                              : 'bg-red-50 border-red-200 hover:bg-red-100 hover:border-red-300'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-lg md:text-2xl mb-1 md:mb-2">👨</div>
                            <div className="font-semibold text-red-600 text-xs md:text-sm">아빠</div>
                          </div>
                        </button>
                      </div>
                      <div className="mt-3 text-sm text-gray-600">
                        선택된 구성원: {formData.family_members.map(member => FAMILY_MEMBER_LABELS[member]).join(', ')}
                        {formData.family_members.includes('family') && ' (모든 구성원에게 표시)'}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        주기
                      </label>
                      <Select
                        value={formData.frequency}
                        onValueChange={handleFrequencyChange}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">매일</SelectItem>
                          <SelectItem value="weekly">매주 특정 요일</SelectItem>
                          <SelectItem value="monthly">매월 특정 일</SelectItem>
                          <SelectItem value="custom">패턴</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 주간 특정 요일 선택 */}
                    {formData.frequency === 'weekly' && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          요일 선택
                        </label>
                        <Select
                          value={formData.weekly_day?.toString() || ""}
                          onValueChange={(value) => setFormData({...formData, weekly_day: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="요일을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">일요일</SelectItem>
                            <SelectItem value="1">월요일</SelectItem>
                            <SelectItem value="2">화요일</SelectItem>
                            <SelectItem value="3">수요일</SelectItem>
                            <SelectItem value="4">목요일</SelectItem>
                            <SelectItem value="5">금요일</SelectItem>
                            <SelectItem value="6">토요일</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 월간 특정 일 선택 */}
                    {formData.frequency === 'monthly' && (
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          일 선택
                        </label>
                        <Select
                          value={formData.monthly_day?.toString() || ""}
                          onValueChange={(value) => setFormData({...formData, monthly_day: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="일을 선택하세요" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                              <SelectItem key={day} value={day.toString()}>
                                {day}일
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* 패턴 선택 */}
                    {formData.frequency === 'custom' && (
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">
                            패턴
                          </label>
                          <Select
                            value={(() => {
                              if (!formData.custom_pattern) return "";
                              try {
                                const pattern = JSON.parse(formData.custom_pattern);
                                return pattern.type;
                              } catch {
                                return "";
                              }
                            })()}
                            onValueChange={(value) => {
                              let pattern;
                              switch (value) {
                                case 'daily':
                                  pattern = JSON.stringify({ type: 'daily' });
                                  break;
                                case 'interval':
                                  pattern = JSON.stringify({ type: 'interval', interval: 3 });
                                  break;
                                case 'specific_days':
                                  pattern = JSON.stringify({ type: 'specific_days', days: [1, 3, 5] }); // 기본값: 월,수,금
                                  break;
                                case 'weekday':
                                  pattern = JSON.stringify({ type: 'weekday' });
                                  break;
                                case 'weekend':
                                  pattern = JSON.stringify({ type: 'weekend' });
                                  break;
                                default:
                                  pattern = JSON.stringify({ type: 'daily' });
                              }
                              setFormData({...formData, custom_pattern: pattern});
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="패턴을 선택하세요" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">매일</SelectItem>
                              <SelectItem value="interval">간격 기반</SelectItem>
                              <SelectItem value="specific_days">특정 요일</SelectItem>
                              <SelectItem value="weekday">평일만 (월~금)</SelectItem>
                              <SelectItem value="weekend">주말만 (토,일)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 간격 기반 설정 */}
                        {(() => {
                          if (!formData.custom_pattern) return null;
                          try {
                            const pattern = JSON.parse(formData.custom_pattern);
                            return pattern.type === 'interval';
                          } catch {
                            return false;
                          }
                        })() && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              간격 (일)
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max="365"
                              value={(() => {
                                try {
                                  const pattern = JSON.parse(formData.custom_pattern);
                                  return pattern.interval || 3;
                                } catch {
                                  return 3;
                                }
                              })()}
                              onChange={(e) => {
                                try {
                                  const pattern = JSON.parse(formData.custom_pattern);
                                  const newPattern = { ...pattern, interval: parseInt(e.target.value) || 1 };
                                  setFormData({...formData, custom_pattern: JSON.stringify(newPattern)});
                                } catch {
                                  // 기본값으로 설정
                                  setFormData({...formData, custom_pattern: JSON.stringify({ type: 'interval', interval: parseInt(e.target.value) || 1 })});
                                }
                              }}
                              placeholder="3"
                              className="w-24"
                            />
                            <span className="text-sm text-gray-500 ml-2">일마다</span>
                          </div>
                        )}

                        {/* 특정 요일 선택 */}
                        {(() => {
                          if (!formData.custom_pattern) return null;
                          try {
                            const pattern = JSON.parse(formData.custom_pattern);
                            return pattern.type === 'specific_days';
                          } catch {
                            return false;
                          }
                        })() && (
                          <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">
                              요일 선택 (다중 선택 가능)
                            </label>
                            <div className="grid grid-cols-7 gap-2">
                              {[
                                { value: 0, label: '일' },
                                { value: 1, label: '월' },
                                { value: 2, label: '화' },
                                { value: 3, label: '수' },
                                { value: 4, label: '목' },
                                { value: 5, label: '금' },
                                { value: 6, label: '토' }
                              ].map(day => (
                                <label key={day.value} className="flex items-center space-x-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={(() => {
                                      try {
                                        const pattern = JSON.parse(formData.custom_pattern);
                                        return pattern.days?.includes(day.value) || false;
                                      } catch {
                                        return false;
                                      }
                                    })()}
                                    onChange={(e) => {
                                      try {
                                        const pattern = JSON.parse(formData.custom_pattern);
                                        let days = pattern.days || [];
                                        
                                        if (e.target.checked) {
                                          if (!days.includes(day.value)) {
                                            days = [...days, day.value].sort();
                                          }
                                        } else {
                                          days = days.filter((d: number) => d !== day.value);
                                        }
                                        
                                        const newPattern = { ...pattern, days };
                                        setFormData({...formData, custom_pattern: JSON.stringify(newPattern)});
                                      } catch {
                                        // 기본값으로 설정
                                        const days = e.target.checked ? [day.value] : [];
                                        setFormData({...formData, custom_pattern: JSON.stringify({ type: 'specific_days', days })});
                                      }
                                    }}
                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                  />
                                  <span className="text-sm text-gray-700">{day.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 선택된 패턴 미리보기 */}
                        {formData.custom_pattern && (
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <div className="text-xs font-medium text-gray-700 mb-1">선택된 패턴:</div>
                            <div className="text-xs text-gray-600 break-all">
                              {formData.custom_pattern}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        시작 시간
                      </label>
                      <Input
                        type="time"
                        value={formData.start_time}
                        onChange={(e) => setFormData({
                          ...formData, 
                          start_time: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        종료 시간
                      </label>
                      <Input
                        type="time"
                        value={formData.end_time}
                        onChange={(e) => setFormData({
                          ...formData, 
                          end_time: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        시작일
                      </label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({
                          ...formData, 
                          start_date: e.target.value
                        })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        종료일 (기본값: 시작일로부터 3개월 후)
                      </label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({
                          ...formData, 
                          end_date: e.target.value
                        })}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        시작일: {formData.start_date} → 종료일: {formData.end_date}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => {
                        resetForm();
                        setIsDialogOpen(false);
                      }}>
                        취소
                      </Button>
                      <Button onClick={handleSave}>
                        {editingSchedule ? "수정" : "추가"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>



          {/* 날짜 네비게이션 */}
          <div className="flex justify-between items-center mb-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'month') {
                  setCurrentDate(subMonths(currentDate, 1));
                } else if (viewMode === 'week') {
                  handleWeekNavigation('prev');
                } else {
                  handleDayNavigation('prev');
                }
              }}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
            </Button>
            
            <div className="flex flex-col items-center">
              {viewMode === 'month' && (
                <h2 className="text-lg font-semibold">
                  {format(currentDate, 'yyyy년 M월', { locale: ko })}
                </h2>
              )}
              {viewMode === 'week' && (
                <h2 className="text-lg font-semibold">
                  {format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy년 M월 d일', { locale: ko })} ~ {format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'M월 d일', { locale: ko })}
                </h2>
              )}
              {viewMode === 'day' && (
                <h3 className="text-base font-semibold">
                  {format(currentDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
                </h3>
              )}
              
              {/* 오늘/이번주/이번달로 돌아가기 버튼 */}
              {(() => {
                if (viewMode === 'month') {
                  return !isSameMonth(currentDate, new Date()) ? (
                    <div className="relative group">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCurrentDate(new Date())}
                        className="p-2 h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 mt-1 transition-colors"
                      >
                        <CalendarDays className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                        이번달로 돌아가기
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  ) : null;
                } else if (viewMode === 'week') {
                  const today = new Date();
                  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
                  const currentWeekEnd = endOfWeek(today, { weekStartsOn: 1 });
                  const isCurrentWeek = currentDate >= currentWeekStart && currentDate <= currentWeekEnd;
                  return !isCurrentWeek ? (
                    <div className="relative group">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCurrentDate(new Date())}
                        className="p-2 h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 mt-1 transition-colors"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                        이번주로 돌아가기
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  ) : null;
                } else if (viewMode === 'day') {
                  return !isToday(currentDate) ? (
                    <div className="relative group">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setCurrentDate(new Date())}
                        className="p-2 h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 mt-1 transition-colors"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg">
                        오늘로 돌아가기
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </div>
                  ) : null;
                }
                return null;
              })()}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (viewMode === 'month') {
                  setCurrentDate(addMonths(currentDate, 1));
                } else if (viewMode === 'week') {
                  handleWeekNavigation('next');
                } else {
                  handleDayNavigation('next');
                }
              }}
            >
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          
          

          {/* 월별 뷰 */}
          {viewMode === 'month' && (
            <div className="mb-6" key={refreshKey}>
              {/* 디버깅 정보 */}
              <div className="text-xs text-gray-500 mb-2 p-2 bg-gray-50 rounded border">
                <div className="flex justify-between items-center">
                  <div>
                    <div>현재 월: {format(currentDate, 'yyyy-MM')}</div>
                    <div>전체 일정 수: {schedules.length}개</div>
                    <div>완료 상태 수: {completions.length}개</div>
                  </div>
                  <div className="text-right">
                    <div className="flex flex-col space-y-1">
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-blue-50 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">🕐</div>
                        <span>Time</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-green-50 text-green-700 rounded-full flex items-center justify-center text-xs font-bold">C</div>
                        <span>Complete</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-4 bg-orange-50 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold">T</div>
                        <span>To Do</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* 요일 헤더 */}
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-500 bg-gray-50">
                    {day}
                  </div>
                ))}
                
                {/* 달력 그리드 */}
                {(() => {
                  const start = startOfMonth(currentDate);
                  const end = endOfMonth(currentDate);
                  const startDay = start.getDay(); // 0: 일요일, 1: 월요일, ...
                  const daysInMonth = end.getDate();
                  
                  // 이전 달의 마지막 날짜들 (빈 칸 채우기)
                  const prevMonthDays = [];
                  const prevMonthEnd = subDays(start, 1);
                  for (let i = startDay - 1; i >= 0; i--) {
                    prevMonthDays.push(subDays(prevMonthEnd, i));
                  }
                  
                  // 현재 달의 날짜들
                  const currentMonthDays = [];
                  for (let i = 1; i <= daysInMonth; i++) {
                    currentMonthDays.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
                  }
                  
                  // 다음 달의 첫 날짜들 (빈 칸 채우기)
                  const nextMonthDays = [];
                  const totalCells = 42; // 6주 × 7일 = 42칸
                  const remainingCells = totalCells - prevMonthDays.length - currentMonthDays.length;
                  for (let i = 1; i <= remainingCells; i++) {
                    nextMonthDays.push(addDays(end, i));
                  }
                  
                  // 모든 날짜를 합쳐서 렌더링
                  const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];
                  
                  return allDays.map((date, index) => {
                    const daySchedules = getSchedulesForDate(date);
                    const isCurrentDate = isToday(date);
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    
                    // 간단한 디버깅: 모든 날짜의 일정 수 표시
                    if (daySchedules.length > 0) {
                      console.log(`${format(date, 'yyyy-MM-dd')} 일정 수:`, daySchedules.length);
                    }
                    
                    return (
                      <div
                        key={index}
                        className={`min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isCurrentDate ? 'bg-blue-50' : ''
                        } ${
                          !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                        }`}
                        onClick={() => {
                          if (isCurrentMonth) {
                            resetForm(date); // 선택된 날짜로 폼 초기화
                            setIsDialogOpen(true);
                          }
                        }}
                      >
                        <div className={`text-xs sm:text-sm font-medium mb-1 ${
                          !isCurrentMonth ? 'text-gray-400' : ''
                        }`}>
                          {format(date, 'd')}
                        </div>
                                                <div className="space-y-1 max-h-[60px] sm:max-h-[80px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                          {daySchedules.length > 0 ? (
                            <div className="block sm:hidden">
                              {/* 모바일: 시간 정보와 완료/미완료 개수 표시 */}
                              {(() => {
                                const completedCount = daySchedules.filter(schedule => isScheduleCompleted(schedule.id, date)).length;
                                const incompleteCount = daySchedules.length - completedCount;
                                const hasTimeInfo = daySchedules.some(schedule => schedule.start_time);
                                
                                return (
                                  <div className="text-xs space-y-1">
                                    {hasTimeInfo && (
                                      <div className="text-center py-1 bg-blue-50 text-blue-700 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold whitespace-nowrap">
                                        🕐
                                      </div>
                                    )}
                                    {completedCount > 0 && (
                                      <div className="text-center py-1 bg-green-50 text-green-700 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold whitespace-nowrap">
                                        C{completedCount}
                                      </div>
                                    )}
                                    {incompleteCount > 0 && (
                                      <div className="text-center py-1 bg-orange-50 text-orange-700 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold whitespace-nowrap">
                                        T{incompleteCount}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ) : null}
                                                      <div className="hidden sm:block">
                              {/* 데스크톱: 시간 정보 포함하여 표시 */}
                              {daySchedules.map(schedule => {
                                const isCompleted = isScheduleCompleted(schedule.id, date);
                                return (
                                  <div
                                    key={schedule.id}
                                    className={`flex items-center justify-between p-2 rounded border text-xs ${
                                      isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                                    }`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center space-x-1 min-w-0 flex-1">
                                      <Badge className={`text-xs flex-shrink-0 ${getFrequencyColor(schedule.frequency)}`}>
                                        {getFrequencyShortLabel(schedule.frequency)}
                                      </Badge>
                                      <div className="min-w-0 flex-1">
                                        <div className={`truncate text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                          {schedule.title}
                                        </div>
                                        {schedule.start_time && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            🕐 {formatTime(schedule.start_time)}
                                            {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-1 flex-shrink-0">
                                      <input
                                        type="checkbox"
                                        checked={isCompleted}
                                        onChange={() => handleToggleComplete(schedule.id, date)}
                                        className="h-3 w-3 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              

            </div>
          )}

          {/* 주별 뷰 */}
          {viewMode === 'week' && (
            <div className="mb-6" key={refreshKey}>
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-500 bg-gray-50">
                    {day}
                  </div>
                ))}
                {getWeekDays().map((date, index) => {
                  const daySchedules = getSchedulesForDate(date);
                  const isCurrentDate = isToday(date);
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[100px] sm:min-h-[120px] p-1 sm:p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isCurrentDate ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        resetForm(date);
                        setIsDialogOpen(true);
                      }}
                    >
                      <div className="text-sm font-medium mb-1">
                        {format(date, 'd')}
                      </div>
                      <div className="space-y-1 max-h-[100px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {daySchedules.length > 0 ? (
                          <div className="block sm:hidden">
                            {(() => {
                              const completedCount = daySchedules.filter(schedule => isScheduleCompleted(schedule.id, date)).length;
                              const incompleteCount = daySchedules.length - completedCount;
                              const hasTimeInfo = daySchedules.some(schedule => schedule.start_time);
                              
                              return (
                                <div className="text-xs space-y-1">
                                  {hasTimeInfo && (
                                    <div className="text-center py-1 bg-blue-50 text-blue-700 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold whitespace-nowrap">
                                      🕐
                                    </div>
                                  )}
                                  {completedCount > 0 && (
                                    <div className="text-center py-1 bg-green-50 text-green-700 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold whitespace-nowrap">
                                      C{completedCount}
                                    </div>
                                  )}
                                  {incompleteCount > 0 && (
                                    <div className="text-center py-1 bg-orange-50 text-orange-700 rounded-full w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center text-xs font-bold whitespace-nowrap">
                                      T{incompleteCount}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        ) : null}
                        <div className="hidden sm:block">
                          {daySchedules.map(schedule => {
                            const isCompleted = isScheduleCompleted(schedule.id, date);
                            return (
                              <div
                                key={schedule.id}
                                className={`flex items-center justify-between p-2 rounded border text-xs ${
                                  isCompleted ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center space-x-1 min-w-0 flex-1">
                                  <Badge className={`text-xs flex-shrink-0 ${getFrequencyColor(schedule.frequency)}`}>
                                    {getFrequencyShortLabel(schedule.frequency)}
                                  </Badge>
                                  <div className="min-w-0 flex-1">
                                    <div className={`truncate text-sm ${isCompleted ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                                      {schedule.title}
                                    </div>
                                    {schedule.start_time && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        🕐 {formatTime(schedule.start_time)}
                                        {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1 flex-shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={isCompleted}
                                    onChange={() => handleToggleComplete(schedule.id, date)}
                                    className="h-3 w-3 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* 일별 뷰 */}
          {viewMode === 'day' && (
            <div className="mb-6" key={refreshKey}>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h3 className="text-lg font-semibold mb-2">
                  {format(currentDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
                </h3>

                <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2">
                  {getSchedulesForDate(currentDate).map(schedule => {
                    const isCompleted = isScheduleCompleted(schedule.id, currentDate);
                    return (
                      <div
                        key={schedule.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <Badge className={`flex-shrink-0 ${getFrequencyColor(schedule.frequency)}`}>
                            {getFrequencyShortLabel(schedule.frequency)}
                            {schedule.frequency === 'weekly' && schedule.weekly_day !== null && schedule.weekly_day !== undefined && 
                              ` ${getWeeklyDayLabel(schedule.weekly_day)}`
                            }
                            {schedule.frequency === 'monthly' && schedule.monthly_day !== null && schedule.monthly_day !== undefined && 
                              ` ${getMonthlyDayLabel(schedule.monthly_day)}`
                            }
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <h4 className={`font-medium truncate ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                              {schedule.title}
                            </h4>
                            <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                              {schedule.start_time && (
                                <span>🕐 {formatTime(schedule.start_time)}</span>
                              )}
                              {schedule.end_time && (
                                <span>~ {formatTime(schedule.end_time)}</span>
                              )}
                            </div>
                            {schedule.description && (
                              <p className={`text-sm truncate ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                {schedule.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => handleToggleComplete(schedule.id, currentDate)}
                              className="h-4 w-4 text-green-600 rounded border-gray-300 focus:ring-green-500 cursor-pointer"
                              title={isCompleted ? '완료됨 - 클릭하여 미완료로 변경' : '미완료 - 클릭하여 완료로 변경'}
                            />
                            <span className="text-sm text-gray-600">
                              {isCompleted ? '완료' : '미완료'}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(schedule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {getSchedulesForDate(currentDate).length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <div className="mb-2">이 날의 일정이 없습니다.</div>
                      <div className="text-xs text-gray-400">
                        {format(currentDate, 'yyyy-MM-dd')}에는 등록된 일정이 없습니다.
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          resetForm(currentDate);
                          setIsDialogOpen(true);
                        }}
                        className="mt-2"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        이 날에 일정 추가하기
                      </Button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* 현재 기간 일정 */}
          {getCurrentPeriodSchedules().length > 0 && (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {getCurrentPeriodTitle()}
                  {selectedFamilyMembers.length > 0 && !selectedFamilyMembers.includes('family') && (
                    <span className="text-sm font-normal text-gray-600 ml-2">
                      ({selectedFamilyMembers.map(member => FAMILY_MEMBER_LABELS[member]).join(', ')})
                    </span>
                  )}
                </h3>
                <div className="text-sm text-gray-600">
                  총 {getCurrentPeriodSchedules().length}개 일정
                </div>
              </div>
              <div className="space-y-3">
                {getCurrentPeriodSchedules().map((schedule) => (
                  <Card 
                    key={schedule.id} 
                    className="hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer border border-blue-200 bg-blue-50"
                    onClick={() => handleEdit(schedule)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <CalendarIcon className="h-4 w-4 text-blue-500 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-gray-900 truncate">{schedule.title}</h4>
                                                          <div className="flex items-center space-x-2 mt-1">
                                <Badge className={`text-xs ${getFrequencyColor(schedule.frequency)}`}>
                                  {getPatternDetail(schedule)}
                                </Badge>
                                {schedule.start_time && (
                                  <span className="text-xs text-gray-500">🕐 {formatTime(schedule.start_time)}</span>
                                )}
                                {schedule.end_time && (
                                  <span className="text-xs text-gray-500">~ {formatTime(schedule.end_time)}</span>
                                )}
                                {/* 가족 구성원 배지들 */}
                                <div className="flex space-x-1">
                                  {schedule.family_members && Array.isArray(schedule.family_members) ? 
                                    schedule.family_members.map(member => (
                                      <Badge key={member} className={`text-xs ${FAMILY_MEMBER_COLORS[member]}`}>
                                        {FAMILY_MEMBER_LABELS[member]}
                                      </Badge>
                                    ))
                                    : 
                                    <Badge className="text-xs bg-blue-100 text-blue-800">
                                      가족
                                    </Badge>
                                  }
                                </div>
                              </div>
                          </div>
                        </div>
                        <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(schedule)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}



          {/* 등록된 일정 */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                등록된 일정 
                {selectedFamilyMembers.length > 0 && !selectedFamilyMembers.includes('family') && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    ({selectedFamilyMembers.map(member => FAMILY_MEMBER_LABELS[member]).join(', ')})
                  </span>
                )}
              </h3>
              
              {/* 정렬 옵션 */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">정렬:</span>
                <Select
                  value={sortBy}
                  onValueChange={(value: string) => setSortBy(value as typeof sortBy)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_desc">최신순</SelectItem>
                    <SelectItem value="created_asc">오래된순</SelectItem>
                    <SelectItem value="start_date_asc">시작일순</SelectItem>
                    <SelectItem value="start_date_desc">시작일역순</SelectItem>
                    <SelectItem value="title_asc">제목순</SelectItem>
                    <SelectItem value="frequency_asc">주기순</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {getFilteredSchedules().map((schedule) => (
              <Card 
                key={schedule.id} 
                className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-blue-200"
                onClick={() => handleEdit(schedule)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg">{schedule.title}</CardTitle>
                      <Badge className={getFrequencyColor(schedule.frequency)}>
                        {getPatternDetail(schedule)}
                      </Badge>
                      {/* 가족 구성원 배지들 */}
                      <div className="flex space-x-1">
                        {schedule.family_members && Array.isArray(schedule.family_members) ? 
                          schedule.family_members.map(member => (
                            <Badge key={member} className={`text-xs ${FAMILY_MEMBER_COLORS[member]}`}>
                              {FAMILY_MEMBER_LABELS[member]}
                            </Badge>
                          ))
                          : 
                          <Badge className="text-xs bg-blue-100 text-blue-800">
                            가족
                          </Badge>
                        }
                      </div>
                    </div>
                    <div className="flex space-x-1" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(schedule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {schedule.description && (
                    <CardDescription>{schedule.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-600 space-y-2">
                    <div className="flex items-center space-x-4">
                      <p>시작일: {format(new Date(schedule.start_date), 'yyyy년 M월 d일')}</p>
                      {schedule.start_time && (
                        <p>시작시간: {formatTime(schedule.start_time)}</p>
                      )}
                      {schedule.end_time && (
                        <p>종료시간: {formatTime(schedule.end_time)}</p>
                      )}
                      {schedule.end_date && (
                        <p>종료일: {format(new Date(schedule.end_date), 'yyyy년 M월 d일')}</p>
                      )}
                    </div>
                    
                    {/* 패턴 상세 정보 */}
                    {schedule.frequency === 'custom' && schedule.custom_pattern && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="text-xs font-medium text-gray-700 mb-1">패턴 상세:</div>
                        <div className="text-xs text-gray-600 break-all">
                          {schedule.custom_pattern}
                        </div>
                      </div>
                    )}
                    
                    {/* 주간/월간 특정 설정 */}
                    {schedule.frequency === 'weekly' && schedule.weekly_day !== null && schedule.weekly_day !== undefined && (
                      <p className="text-blue-600">매주 {getWeeklyDayLabel(schedule.weekly_day)}요일</p>
                    )}
                    {schedule.frequency === 'monthly' && schedule.monthly_day !== null && schedule.monthly_day !== undefined && (
                      <p className="text-purple-600">매월 {schedule.monthly_day}일</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {getFilteredSchedules().length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {selectedFamilyMembers.includes('family')
                ? selectedFamilyMembers.length === 1
                  ? 'family로 등록된 일정이 없습니다.'
                  : `가족 + ${selectedFamilyMembers.filter(m => m !== 'family').map(member => FAMILY_MEMBER_LABELS[member]).join(', ')}에 해당하는 일정이 없습니다.`
                : selectedFamilyMembers.length > 0
                  ? `선택된 구성원(${selectedFamilyMembers.map(member => FAMILY_MEMBER_LABELS[member]).join(', ')})의 일정이 없습니다.`
                  : '등록된 일정이 없습니다.'
              }
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
