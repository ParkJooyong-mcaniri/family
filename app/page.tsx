"use client";

import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, List, Clock, ChefHat } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { schedulesApi, familyMealsApi, mealsApi, recipesApi, Schedule } from "@/lib/supabase-client";
import Link from "next/link";

// 시간을 HH:MM 형식으로 포맷팅하는 함수
const formatTime = (timeString: string) => {
  if (!timeString) return '';
  // HH:MM:SS 형식에서 HH:MM만 추출
  return timeString.substring(0, 5);
};

export default function Home() {
  const [memberSchedules, setMemberSchedules] = useState<{ [key: string]: Array<{
    id: string;
    title: string;
    description?: string;
    frequency: string;
    start_date: string;
    end_date?: string;
    family_members: string[];
    completed: boolean;
    start_time?: string;
    end_time?: string;
  }> }>({});
  
  // 각 구성원별 "더보기" 상태 관리
  const [expandedMembers, setExpandedMembers] = useState<{ [key: string]: boolean }>({
    family: false,
    mom: false,
    dad: false,
    sein: false,
    seha: false
  });
  
  const [familyMeals, setFamilyMeals] = useState<{
    id: string;
    date: string;
    breakfast?: string[] | null;
    lunch?: string[] | null;
    dinner?: string[] | null;
  }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSchedules: 0,
    totalFamilyMeals: 0,
    totalMeals: 0,
    totalRecipes: 0,
    yesterdayUncompleted: 0,
    todayUncompleted: 0,
    tomorrowUncompleted: 0,
  });

  // "더보기" 토글 함수
  const toggleExpanded = (member: string) => {
    setExpandedMembers(prev => ({
      ...prev,
      [member]: !prev[member]
    }));
  };

  // 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      console.log('데이터 로드 시작...');
      
      try {
        // 기본 통계 데이터만 로드 (일정 관련)
        const schedulesData = await schedulesApi.getAll();
        
        // 가족식단 데이터 로드
        try {
          const familyMealsData = await familyMealsApi.getByMonth(new Date().getFullYear(), new Date().getMonth() + 1);
          setFamilyMeals(familyMealsData || []);
          console.log('가족식단 데이터 로드 완료:', familyMealsData);
        } catch (familyMealsError) {
          console.error('가족식단 데이터 로드 실패:', familyMealsError);
          setFamilyMeals([]);
        }
        
        // schedules 데이터는 사용하지 않으므로 주석 처리
        
        // 가족 구성원별 오늘 일정 조회
        const familyMembers = ['family', 'mom', 'sein', 'seha', 'dad'];
        console.log('가족 구성원별 일정 조회 시작...');
        
        try {
          const todayMemberSchedules = await schedulesApi.getTodaySchedulesByMember(familyMembers);
          setMemberSchedules(todayMemberSchedules);
          console.log('가족 구성원별 오늘 일정 로드 완료:', todayMemberSchedules);
        } catch (scheduleError) {
          console.error('가족 구성원별 일정 조회 실패:', scheduleError);
          // 에러 시 빈 데이터로 설정
          const emptySchedules: { [key: string]: Array<{
            id: string;
            title: string;
            description?: string;
            frequency: string;
            start_date: string;
            end_date?: string;
            family_members: string[];
            completed: boolean;
          }> } = {};
          familyMembers.forEach(member => {
            emptySchedules[member] = [];
          });
          setMemberSchedules(emptySchedules);
        }
        
        // 기본 통계 설정
        setStats({
          totalSchedules: schedulesData?.length || 0,
          totalFamilyMeals: 0,
          totalMeals: 0,
          totalRecipes: 0,
          yesterdayUncompleted: 0,
          todayUncompleted: 0,
          tomorrowUncompleted: 0,
        });

        // 해야 할 일 통계 계산
        if (schedulesData && schedulesData.length > 0) {
          const today = new Date();
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // 각 날짜에 해당하는 일정들을 찾고, 완료되지 않은 것들의 수를 계산
          const getApplicableSchedulesForDate = (date: Date) => {
            return schedulesData.filter(schedule => {
              const start = new Date(schedule.start_date);
              const end = schedule.end_date ? new Date(schedule.end_date) : new Date(2100, 0, 1);
              
              // 날짜 범위 체크 (시간 제거하여 정확한 비교)
              const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
              const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
              
              if (checkDate < startDate || checkDate > endDate) return false;
              
              // 빈도별 필터링
              switch (schedule.frequency) {
                case 'daily':
                  return true;
                case 'weekly':
                  if (schedule.weekly_day !== null && schedule.weekly_day !== undefined) {
                    let scheduleDay = schedule.weekly_day;
                    if (scheduleDay >= 1 && scheduleDay <= 7) {
                      scheduleDay = scheduleDay === 7 ? 0 : scheduleDay;
                    }
                    return date.getDay() === scheduleDay;
                  }
                  // 주차 기반
                  const weekStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() - startDate.getDay());
                  const currentWeekStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - checkDate.getDay());
                  const weekDiff = Math.floor((currentWeekStart.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000));
                  return weekDiff >= 0 && weekDiff % 1 === 0;
                case 'monthly':
                  if (schedule.monthly_day !== null && schedule.monthly_day !== undefined) {
                    return date.getDate() === schedule.monthly_day;
                  }
                  return date.getDate() === startDate.getDate();
                case 'custom':
                  return true; // 커스텀 패턴은 일단 모든 날짜에 적용
                default:
                  return false;
              }
            });
          };

          const yesterdayUncompleted = getApplicableSchedulesForDate(yesterday).length;
          const todayUncompleted = getApplicableSchedulesForDate(today).length;
          const tomorrowUncompleted = getApplicableSchedulesForDate(tomorrow).length;

          setStats(prev => ({
            ...prev,
            yesterdayUncompleted,
            todayUncompleted,
            tomorrowUncompleted,
          }));

          console.log('해야 할 일 통계 계산 완료:', {
            yesterdayUncompleted,
            todayUncompleted,
            tomorrowUncompleted,
            totalSchedules: schedulesData.length,
            today: today.toDateString(),
            yesterday: yesterday.toDateString(),
            tomorrow: tomorrow.toDateString()
          });
        }
        
      } catch (error) {
        console.error('데이터 로드 실패:', error);
        // 에러 시에도 기본 통계는 0으로 설정
        setStats({
          totalSchedules: 0,
          totalFamilyMeals: 0,
          totalMeals: 0,
          totalRecipes: 0,
          yesterdayUncompleted: 0,
          todayUncompleted: 0,
          tomorrowUncompleted: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // 추가 통계 데이터 로드 (가족식단, 메뉴, 레시피)
  useEffect(() => {
    console.log('=== 추가 통계 useEffect 실행됨 ===');
    
    const loadAdditionalStats = async () => {
      try {
        console.log('추가 통계 로드 시작...');
        
        // 가족식단 통계
        console.log('가족식단 통계 조회 시작...');
        const familyMealsData = await familyMealsApi.getByMonth(new Date().getFullYear(), new Date().getMonth() + 1);
        const totalFamilyMeals = familyMealsData ? familyMealsData.length : 0;
        console.log('가족식단 데이터:', familyMealsData);

        // 메뉴 통계
        console.log('메뉴 통계 조회 시작...');
        const mealsData = await mealsApi.getAll();
        const totalMeals = mealsData ? mealsData.length : 0;
        console.log('메뉴 데이터:', mealsData);

        // 레시피 통계
        console.log('레시피 통계 조회 시작...');
        const recipesData = await recipesApi.getAll();
        const totalRecipes = recipesData ? recipesData.length : 0;
        console.log('레시피 데이터:', recipesData);

        setStats(prev => ({
          ...prev,
          totalFamilyMeals,
          totalMeals,
          totalRecipes,
        }));

        console.log('추가 통계 로드 완료:', {
          totalFamilyMeals,
          totalMeals,
          totalRecipes,
        });
      } catch (error) {
        console.error('추가 통계 로드 실패:', error);
        console.error('에러 상세:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
    };

    // 즉시 실행
    loadAdditionalStats();
    
    // 추가로 1초 후에도 실행 (혹시 타이밍 문제가 있을 수 있음)
    const timer = setTimeout(() => {
      console.log('타이머로 추가 통계 로드 실행');
      loadAdditionalStats();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const features = [
    {
      title: "가족식단",
      description: "월별 캘린더로 가족의 아침, 점심, 저녁 식단을 관리하세요",
      icon: Calendar,
      href: "/family-meals",
      color: "bg-blue-500",
    },
    {
      title: "식단리스트",
      description: "자주 먹는 메뉴들을 관리하고 가족 호응도를 기록하세요",
      icon: List,
      href: "/meals",
      color: "bg-green-500",
    },
    {
      title: "레시피",
      description: "다양한 요리 레시피를 저장하고 공유하세요",
      icon: ChefHat,
      href: "/recipes",
      color: "bg-purple-500",
    },
    {
      title: "일정 관리",
      description: "주기적인 업무 일정을 캘린더로 관리하세요",
      icon: Clock,
      href: "/schedule",
      color: "bg-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center py-16 px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8">
            Simply Us.
          </h1>
          
          {/* 해야할일 영역을 타이틀 바로 아래로 이동 */}
          <div className="max-w-6xl mx-auto mb-12">
            <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center">
                의미있는 하루
              </h2>
              

              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Link href="/schedule?member=family&view=day" className="block">
                  <div className="bg-orange-50 rounded-lg p-4 border border-orange-200 hover:bg-orange-100 transition-colors cursor-pointer">
                    <div className="text-orange-600 font-semibold mb-2 text-center">👨‍👩‍👧‍👦 가족</div>
                    <div className="mt-2 text-xs text-gray-500">
                      {isLoading ? (
                        <div className="text-gray-400">로딩 중...</div>
                      ) : memberSchedules['family'] && memberSchedules['family'].length > 0 ? (
                        <>
                          {/* 처음 3개 일정 표시 */}
                          {memberSchedules['family'].slice(0, 3).map((schedule, index) => {
                            console.log(`Family 일정 ${index} 상세:`, {
                              title: schedule.title,
                              completed: schedule.completed,
                              family_members: schedule.family_members,
                              frequency: schedule.frequency,
                              start_date: schedule.start_date,
                              end_date: schedule.end_date
                            });
                            return (
                              <div key={index} className="mb-2">
                                <div className="flex items-center space-x-2">
                                  {schedule.completed ? (
                                    <>
                                      <span className="text-green-500">✅</span>
                                      <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-blue-400">🚀</span>
                                      <span className="text-gray-600 text-xs">{schedule.title}</span>
                                    </>
                                  )}
                                </div>
                                {schedule.start_time && (
                                  <div className="text-xs text-gray-400 ml-6 mt-1">
                                    🕐 {formatTime(schedule.start_time)}
                                    {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* 3개 초과 시 "더보기" 버튼 또는 추가 일정 표시 */}
                          {memberSchedules['family'].length > 3 && (
                            <>
                              {expandedMembers['family'] ? (
                                // 확장된 상태: 나머지 일정 모두 표시
                                memberSchedules['family'].slice(3).map((schedule, index) => (
                                  <div key={`expanded-${index}`} className="mb-2">
                                    <div className="flex items-center space-x-2">
                                      {schedule.completed ? (
                                        <>
                                          <span className="text-green-500">✅</span>
                                          <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-blue-400">🚀</span>
                                          <span className="text-gray-600 text-xs">{schedule.title}</span>
                                        </>
                                      )}
                                    </div>
                                    {schedule.start_time && (
                                      <div className="text-xs text-gray-400 ml-6 mt-1">
                                        🕐 {formatTime(schedule.start_time)}
                                        {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : null}
                              
                              {/* 더보기/접기 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleExpanded('family');
                                }}
                                className="w-full mt-2 py-1 px-2 text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 rounded transition-colors"
                              >
                                {expandedMembers['family'] ? '접기' : `더보기 (${memberSchedules['family'].length - 3}개)`}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">오늘 할일이 없습니다</div>
                      )}
                    </div>
                  </div>
                </Link>
                <Link href="/schedule?member=mom&view=day" className="block">
                  <div className="bg-pink-50 rounded-lg p-4 border border-pink-200 hover:bg-pink-100 transition-colors cursor-pointer">
                    <div className="text-pink-600 font-semibold mb-2 text-center">👩 엄마</div>
                    <div className="mt-2 text-xs text-gray-500">
                      {isLoading ? (
                        <div className="text-gray-400">로딩 중...</div>
                      ) : memberSchedules['mom'] && memberSchedules['mom'].length > 0 ? (
                        <>
                          {/* 처음 3개 일정 표시 */}
                          {memberSchedules['mom'].slice(0, 3).map((schedule, index) => {
                            console.log(`Mom 일정 ${index} 상세:`, {
                              title: schedule.title,
                              completed: schedule.completed,
                              family_members: schedule.family_members,
                              frequency: schedule.frequency
                            });
                            return (
                              <div key={index} className="mb-2">
                                <div className="flex items-center space-x-2">
                                  {schedule.completed ? (
                                    <>
                                      <span className="text-green-500">✅</span>
                                      <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-blue-400">🚀</span>
                                      <span className="text-gray-600 text-xs">{schedule.title}</span>
                                    </>
                                  )}
                                </div>
                                {schedule.start_time && (
                                  <div className="text-xs text-gray-400 ml-6 mt-1">
                                    🕐 {formatTime(schedule.start_time)}
                                    {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* 3개 초과 시 "더보기" 버튼 또는 추가 일정 표시 */}
                          {memberSchedules['mom'].length > 3 && (
                            <>
                              {expandedMembers['mom'] ? (
                                // 확장된 상태: 나머지 일정 모두 표시
                                memberSchedules['mom'].slice(3).map((schedule, index) => (
                                  <div key={`expanded-${index}`} className="mb-2">
                                    <div className="flex items-center space-x-2">
                                      {schedule.completed ? (
                                        <>
                                          <span className="text-green-500">✅</span>
                                          <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-blue-400">🚀</span>
                                          <span className="text-gray-600 text-xs">{schedule.title}</span>
                                        </>
                                      )}
                                    </div>
                                    {schedule.start_time && (
                                      <div className="text-xs text-gray-400 ml-6 mt-1">
                                        🕐 {formatTime(schedule.start_time)}
                                        {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : null}
                              
                              {/* 더보기/접기 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleExpanded('mom');
                                }}
                                className="w-full mt-2 py-1 px-2 text-xs bg-pink-100 hover:bg-pink-200 text-pink-700 rounded transition-colors"
                              >
                                {expandedMembers['mom'] ? '접기' : `더보기 (${memberSchedules['mom'].length - 3}개)`}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">오늘 할일이 없습니다</div>
                      )}
                    </div>
                  </div>
                </Link>
                <Link href="/schedule?member=sein&view=day" className="block">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                    <div className="text-blue-600 font-semibold mb-2 text-center">👨 세인</div>
                    <div className="mt-2 text-xs text-gray-500">
                      {isLoading ? (
                        <div className="text-gray-400">로딩 중...</div>
                      ) : memberSchedules['sein'] && memberSchedules['sein'].length > 0 ? (
                        <>
                          {/* 처음 3개 일정 표시 */}
                          {memberSchedules['sein'].slice(0, 3).map((schedule, index) => {
                            console.log(`Sein 일정 ${index} 상세:`, {
                              title: schedule.title,
                              completed: schedule.completed,
                              family_members: schedule.family_members,
                              frequency: schedule.frequency
                            });
                            return (
                              <div key={index} className="mb-2">
                                <div className="flex items-center space-x-2">
                                  {schedule.completed ? (
                                    <>
                                      <span className="text-green-500">✅</span>
                                      <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-blue-400">🚀</span>
                                      <span className="text-gray-600 text-xs">{schedule.title}</span>
                                    </>
                                  )}
                                </div>
                                {schedule.start_time && (
                                  <div className="text-xs text-gray-400 ml-6 mt-1">
                                    🕐 {formatTime(schedule.start_time)}
                                    {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* 3개 초과 시 "더보기" 버튼 또는 추가 일정 표시 */}
                          {memberSchedules['sein'].length > 3 && (
                            <>
                              {expandedMembers['sein'] ? (
                                // 확장된 상태: 나머지 일정 모두 표시
                                memberSchedules['sein'].slice(3).map((schedule, index) => (
                                  <div key={`expanded-${index}`} className="mb-2">
                                    <div className="flex items-center space-x-2">
                                      {schedule.completed ? (
                                        <>
                                          <span className="text-green-500">✅</span>
                                          <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-blue-400">🚀</span>
                                          <span className="text-gray-600 text-xs">{schedule.title}</span>
                                        </>
                                      )}
                                    </div>
                                    {schedule.start_time && (
                                      <div className="text-xs text-gray-400 ml-6 mt-1">
                                        🕐 {formatTime(schedule.start_time)}
                                        {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : null}
                              
                              {/* 더보기/접기 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleExpanded('sein');
                                }}
                                className="w-full mt-2 py-1 px-2 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                              >
                                {expandedMembers['sein'] ? '접기' : `더보기 (${memberSchedules['sein'].length - 3}개)`}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">오늘 할일이 없습니다</div>
                      )}
                    </div>
                  </div>
                </Link>
                <Link href="/schedule?member=seha&view=day" className="block">
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
                    <div className="text-green-600 font-semibold mb-2 text-center">👦 세하</div>
                    <div className="mt-2 text-xs text-gray-500">
                      {isLoading ? (
                        <div className="text-gray-400">로딩 중...</div>
                      ) : memberSchedules['seha'] && memberSchedules['seha'].length > 0 ? (
                        <>
                          {/* 처음 3개 일정 표시 */}
                          {memberSchedules['seha'].slice(0, 3).map((schedule, index) => {
                            console.log(`Seha 일정 ${index} 상세:`, {
                              title: schedule.title,
                              completed: schedule.completed,
                              family_members: schedule.family_members,
                              frequency: schedule.frequency
                            });
                            return (
                              <div key={index} className="mb-2">
                                <div className="flex items-center space-x-2">
                                  {schedule.completed ? (
                                    <>
                                      <span className="text-green-500">✅</span>
                                      <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-blue-400">🚀</span>
                                      <span className="text-gray-600 text-xs">{schedule.title}</span>
                                    </>
                                  )}
                                </div>
                                {schedule.start_time && (
                                  <div className="text-xs text-gray-400 ml-6 mt-1">
                                    🕐 {formatTime(schedule.start_time)}
                                    {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* 3개 초과 시 "더보기" 버튼 또는 추가 일정 표시 */}
                          {memberSchedules['seha'].length > 3 && (
                            <>
                              {expandedMembers['seha'] ? (
                                // 확장된 상태: 나머지 일정 모두 표시
                                memberSchedules['seha'].slice(3).map((schedule, index) => (
                                  <div key={`expanded-${index}`} className="mb-2">
                                    <div className="flex items-center space-x-2">
                                      {schedule.completed ? (
                                        <>
                                          <span className="text-green-500">✅</span>
                                          <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-blue-400">🚀</span>
                                          <span className="text-gray-600 text-xs">{schedule.title}</span>
                                        </>
                                      )}
                                    </div>
                                    {schedule.start_time && (
                                      <div className="text-xs text-gray-400 ml-6 mt-1">
                                        🕐 {formatTime(schedule.start_time)}
                                        {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : null}
                              
                              {/* 더보기/접기 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleExpanded('seha');
                                }}
                                className="w-full mt-2 py-1 px-2 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
                              >
                                {expandedMembers['seha'] ? '접기' : `더보기 (${memberSchedules['seha'].length - 3}개)`}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">오늘 할일이 없습니다</div>
                      )}
                    </div>
                  </div>
                </Link>
                <Link href="/schedule?member=dad&view=day" className="block">
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200 hover:bg-red-100 transition-colors cursor-pointer">
                    <div className="text-red-600 font-semibold mb-2 text-center">👨 아빠</div>
                    <div className="mt-2 text-xs text-gray-500">
                      {isLoading ? (
                        <div className="text-gray-400">로딩 중...</div>
                      ) : memberSchedules['dad'] && memberSchedules['dad'].length > 0 ? (
                        <>
                          {/* 처음 3개 일정 표시 */}
                          {memberSchedules['dad'].slice(0, 3).map((schedule, index) => {
                            console.log(`Dad 일정 ${index} 상세:`, {
                              title: schedule.title,
                              completed: schedule.completed,
                              family_members: schedule.family_members,
                              frequency: schedule.frequency
                            });
                            return (
                              <div key={index} className="mb-2">
                                <div className="flex items-center space-x-2">
                                  {schedule.completed ? (
                                    <>
                                      <span className="text-green-500">✅</span>
                                      <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-blue-400">🚀</span>
                                      <span className="text-gray-600 text-xs">{schedule.title}</span>
                                    </>
                                  )}
                                </div>
                                {schedule.start_time && (
                                  <div className="text-xs text-gray-400 ml-6 mt-1">
                                    🕐 {formatTime(schedule.start_time)}
                                    {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          
                          {/* 3개 초과 시 "더보기" 버튼 또는 추가 일정 표시 */}
                          {memberSchedules['dad'].length > 3 && (
                            <>
                              {expandedMembers['dad'] ? (
                                // 확장된 상태: 나머지 일정 모두 표시
                                memberSchedules['dad'].slice(3).map((schedule, index) => (
                                  <div key={`expanded-${index}`} className="mb-2">
                                    <div className="flex items-center space-x-2">
                                      {schedule.completed ? (
                                        <>
                                          <span className="text-green-500">✅</span>
                                          <span className="line-through text-gray-400 text-xs">{schedule.title}</span>
                                        </>
                                      ) : (
                                        <>
                                          <span className="text-blue-400">🚀</span>
                                          <span className="text-gray-600 text-xs">{schedule.title}</span>
                                        </>
                                      )}
                                    </div>
                                    {schedule.start_time && (
                                      <div className="text-xs text-gray-400 ml-6 mt-1">
                                        🕐 {formatTime(schedule.start_time)}
                                        {schedule.end_time && ` ~ ${formatTime(schedule.end_time)}`}
                                      </div>
                                    )}
                                  </div>
                                ))
                              ) : null}
                              
                              {/* 더보기/접기 버튼 */}
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  toggleExpanded('dad');
                                }}
                                className="w-full mt-2 py-1 px-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
                              >
                                {expandedMembers['dad'] ? '접기' : `더보기 (${memberSchedules['dad'].length - 3}개)`}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="text-gray-400">오늘 할일이 없습니다</div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
                      </div>
        </div>
      </div>

        {/* 오늘의 식단 상세 영역 */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6 text-center flex items-center justify-center">
              <ChefHat className="mr-3 h-8 w-8 text-green-600" />
              오늘의 식단
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 아침 */}
              <Link href="/family-meals" className="block">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer">
                  <div className="flex items-center justify-center mb-4">
                    <Badge className="text-sm bg-blue-100 text-blue-800 px-3 py-1">🌅 아침</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-800">
                      {(() => {
                        const today = new Date();
                        const todayKey = format(today, 'yyyy-MM-dd');
                        const todayMeal = familyMeals.find(fm => fm.date === todayKey);
                        if (!todayMeal?.breakfast) return '등록된 식단이 없습니다';
                        
                        if (Array.isArray(todayMeal.breakfast)) {
                          return todayMeal.breakfast.map((menu, idx) => (
                            <div key={idx} className="mb-2 last:mb-0">
                              • {menu}
                            </div>
                          ));
                        }
                        return todayMeal.breakfast;
                      })()}
                    </div>
                  </div>
                </div>
              </Link>

              {/* 점심 */}
              <Link href="/family-meals" className="block">
                <div className="bg-green-50 rounded-xl p-6 border border-green-200 hover:bg-green-100 transition-colors cursor-pointer">
                  <div className="flex items-center justify-center mb-4">
                    <Badge className="text-sm bg-green-100 text-green-800 px-3 py-1">☀️ 점심</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-800">
                      {(() => {
                        const today = new Date();
                        const todayKey = format(today, 'yyyy-MM-dd');
                        const todayMeal = familyMeals.find(fm => fm.date === todayKey);
                        if (!todayMeal?.lunch) return '등록된 식단이 없습니다';
                        
                        if (Array.isArray(todayMeal.lunch)) {
                          return todayMeal.lunch.map((menu, idx) => (
                            <div key={idx} className="mb-2 last:mb-0">
                              • {menu}
                            </div>
                          ));
                        }
                        return todayMeal.lunch;
                      })()}
                    </div>
                  </div>
                </div>
              </Link>

              {/* 저녁 */}
              <Link href="/family-meals" className="block">
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer">
                  <div className="flex items-center justify-center mb-4">
                    <Badge className="text-sm bg-purple-100 text-purple-800 px-3 py-1">🌙 저녁</Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-800">
                      {(() => {
                        const today = new Date();
                        const todayKey = format(today, 'yyyy-MM-dd');
                        const todayMeal = familyMeals.find(fm => fm.date === todayKey);
                        if (!todayMeal?.dinner) return '등록된 식단이 없습니다';
                        
                        if (Array.isArray(todayMeal.dinner)) {
                          return todayMeal.dinner.map((menu, idx) => (
                            <div key={idx} className="mb-2 last:mb-0">
                              • {menu}
                          </div>
                        ));
                        }
                        return todayMeal.dinner;
                      })()}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Link key={index} href={feature.href}>
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <CardContent className="p-6 text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${feature.color} flex items-center justify-center text-white text-2xl group-hover:scale-110 transition-transform`}>
                      <feature.icon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm group-hover:text-gray-500">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>



        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">빠른 시작</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/family-meals">
              <Button className="w-full h-16 text-lg" size="lg">
                <Calendar className="mr-2 h-5 w-5" />
                오늘 식단 등록하기
              </Button>
            </Link>
            <Link href="/recipes">
              <Button variant="outline" className="w-full h-16 text-lg" size="lg">
                <ChefHat className="mr-2 h-5 w-5" />
                새 레시피 추가하기
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Link href="/family-meals?view=week" className="block">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2 group-hover:text-blue-700">{stats.totalFamilyMeals}</div>
                <div className="text-gray-600 group-hover:text-gray-800">등록된 식단</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/meals" className="block">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2 group-hover:text-green-700">{stats.totalMeals}</div>
                <div className="text-gray-600 group-hover:text-gray-800">저장된 메뉴</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/recipes" className="block">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2 group-hover:text-purple-700">{stats.totalRecipes}</div>
                <div className="text-gray-600 group-hover:text-gray-800">레시피</div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/schedule?view=month" className="block">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2 group-hover:text-orange-700">{stats.totalSchedules}</div>
                <div className="text-gray-600 group-hover:text-gray-800">등록된 일정</div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
