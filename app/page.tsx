"use client";

import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, List, ChefHat, Plus, Clock } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { addDays, subDays, isSameDay, format } from "date-fns";
import { familyMealsApi, mealsApi, recipesApi, schedulesApi, Schedule } from "@/lib/supabase-client";

export default function Home() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [stats, setStats] = useState({
    totalSchedules: 0,
    totalFamilyMeals: 0,
    totalMeals: 0,
    totalRecipes: 0,
    yesterdayUncompleted: 0,
    todayUncompleted: 0,
    tomorrowUncompleted: 0,
  });

  // 실제 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [familyMealsData, mealsData, recipesData, schedulesData] = await Promise.all([
        familyMealsApi.getByMonth(new Date().getFullYear(), new Date().getMonth() + 1),
        mealsApi.getAll(),
        recipesApi.getAll(),
        schedulesApi.getAll()
      ]);

      setSchedules(schedulesData);
      setStats(prev => ({
        ...prev,
        totalFamilyMeals: familyMealsData.length,
        totalMeals: mealsData.length,
        totalRecipes: recipesData.length,
        totalSchedules: schedulesData.length,
      }));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  // 일정 통계 계산 (완료 상태 고려)
  useEffect(() => {
    if (schedules.length === 0) return;

    // 현재 시간 기준으로 정확한 날짜 계산
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 시간 제거
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    console.log('날짜 계산:', {
      today: format(today, 'yyyy-MM-dd'),
      yesterday: format(yesterday, 'yyyy-MM-dd'),
      tomorrow: format(tomorrow, 'yyyy-MM-dd')
    });

    const getUncompletedCountForDate = async (date: Date) => {
      try {
        const dateString = format(date, 'yyyy-MM-dd');
        const scheduleIds = schedules.map(s => s.id);
        
        // 해당 날짜의 완료 상태 일괄 조회
        const completions = await schedulesApi.getCompletionStatuses(scheduleIds, dateString, dateString);
        
        // 해당 날짜에 실행되어야 하는 일정들
        const applicableSchedules = schedules.filter(schedule => {
          const start = new Date(schedule.start_date);
          const end = schedule.end_date ? new Date(schedule.end_date) : new Date(2100, 0, 1);
          
          // 날짜 범위 체크 (시간 제거하여 정확한 비교)
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          
          if (checkDate < startDate || checkDate > endDate) return false;
          
          switch (schedule.frequency) {
            case 'daily':
              return true;
            case 'weekly':
              if (schedule.weekly_day !== null && schedule.weekly_day !== undefined) {
                return date.getDay() === schedule.weekly_day;
              }
              // 기존 로직 (주차 기반)
              const weekDiff = Math.floor((date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
              return weekDiff >= 0 && weekDiff % 1 === 0;
            case 'monthly':
              if (schedule.monthly_day !== null && schedule.monthly_day !== undefined) {
                return date.getDate() === schedule.monthly_day;
              }
              // 기존 로직 (시작일 기준)
              return date.getDate() === start.getDate();
            case 'custom':
              if (schedule.custom_pattern) {
                try {
                  const pattern = JSON.parse(schedule.custom_pattern);
                  switch (pattern.type) {
                    case 'daily':
                      return true;
                    case 'interval':
                      const daysDiff = Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
                      return daysDiff >= 0 && daysDiff % pattern.interval === 0;
                    case 'specific_days':
                      return pattern.days?.includes(date.getDay()) || false;
                    case 'weekday':
                      const currentDay = date.getDay();
                      return currentDay >= 1 && currentDay <= 5;
                    case 'weekend':
                      const day = date.getDay();
                      return day === 0 || day === 6;
                    default:
                      return true;
                  }
                } catch (error) {
                  return true;
                }
              }
              return true;
            default:
              return false;
          }
        });

        // 완료되지 않은 일정 수 계산
        const completedScheduleIds = new Set(
          completions
            .filter(c => c.completed)
            .map(c => c.schedule_id)
        );

        const uncompletedCount = applicableSchedules.filter(schedule => !completedScheduleIds.has(schedule.id)).length;
        console.log(dateString + ' 미완료 일정:', uncompletedCount, '개 (완료:', completions.filter(c => c.completed).length, '개)');

        return uncompletedCount;
      } catch (error) {
        console.error('완료 상태 조회 실패:', error);
        // 에러 시 기존 방식으로 계산
        return schedules.filter(schedule => {
          const start = new Date(schedule.start_date);
          const end = schedule.end_date ? new Date(schedule.end_date) : new Date(2100, 0, 1);
          
          // 날짜 범위 체크 (시간 제거하여 정확한 비교)
          const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
          const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
          
          if (checkDate < startDate || checkDate > endDate) return false;
          
          switch (schedule.frequency) {
            case 'daily':
              return true;
            case 'weekly':
              if (schedule.weekly_day !== null) {
                return date.getDay() === schedule.weekly_day;
              }
              const weekDiff = Math.floor((date.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
              return weekDiff >= 0 && weekDiff % 1 === 0;
            case 'monthly':
              if (schedule.monthly_day !== null) {
                return date.getDate() === schedule.monthly_day;
              }
              return date.getDate() === start.getDate();
            default:
              return false;
          }
        }).length;
      }
    };

    // 비동기로 통계 계산
    const calculateStats = async () => {
      const [yesterdayCount, todayCount, tomorrowCount] = await Promise.all([
        getUncompletedCountForDate(yesterday),
        getUncompletedCountForDate(today),
        getUncompletedCountForDate(tomorrow)
      ]);

      console.log('최종 통계:', {
        yesterday: yesterdayCount,
        today: todayCount,
        tomorrow: tomorrowCount
      });

      setStats(prev => ({
        ...prev,
        yesterdayUncompleted: yesterdayCount,
        todayUncompleted: todayCount,
        tomorrowUncompleted: tomorrowCount,
      }));
    };

    calculateStats();
  }, [schedules]);

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
    <div className="min-h-screen pb-20 md:pb-0 md:pt-16">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            가족 식단 관리
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            가족의 건강한 식단을 관리하고 맛있는 레시피를 공유하는 
            스마트한 식단 관리 애플리케이션입니다.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Link key={feature.href} href={feature.href}>
                <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group">
                  <CardHeader className="text-center">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${feature.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-600">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
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
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.totalFamilyMeals}</div>
              <div className="text-gray-600">등록된 식단</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalMeals}</div>
              <div className="text-gray-600">저장된 메뉴</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{stats.totalRecipes}</div>
              <div className="text-gray-600">레시피</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{stats.totalSchedules}</div>
              <div className="text-gray-600">등록된 일정</div>
            </CardContent>
          </Card>
        </div>

        {/* 일정 통계 */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-orange-500" />
                미완료 일정 현황
              </CardTitle>
              <CardDescription>
                어제, 오늘, 내일의 미완료 일정을 확인하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 mb-1">{stats.yesterdayUncompleted}</div>
                  <div className="text-sm text-red-700">어제</div>
                  <div className="text-xs text-red-600">미완료 일정</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 mb-1">{stats.todayUncompleted}</div>
                  <div className="text-sm text-yellow-700">오늘</div>
                  <div className="text-xs text-yellow-600">미완료 일정</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">{stats.tomorrowUncompleted}</div>
                  <div className="text-sm text-blue-700">내일</div>
                  <div className="text-xs text-blue-600">미완료 일정</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
