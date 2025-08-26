"use client";

import { Navigation } from "@/components/Navigation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect, useRef } from "react";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, List, ChefHat } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, isToday, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { familyMealsApi, mealsApi, FamilyMeal, Meal } from "@/lib/supabase-client";

export default function FamilyMealsPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('day');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>("");
  const [mealName, setMealName] = useState<string>("");
  const [selectedMeals, setSelectedMeals] = useState<{
    breakfast: string[];
    lunch: string[];
    dinner: string[];
  }>({
    breakfast: [],
    lunch: [],
    dinner: []
  });
  
  // 임시 메뉴 리스트 상태 (현재 입력 중인 메뉴들)
  const [tempMenuList, setTempMenuList] = useState<string[]>([]);
  const [familyMeals, setFamilyMeals] = useState<FamilyMeal[]>([]);
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);
  const [lastEnterPressed, setLastEnterPressed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  


  const mealTypes = [
    { value: "breakfast", label: "아침" },
    { value: "lunch", label: "점심" },
    { value: "dinner", label: "저녁" },
  ];

  // 데이터 로드
  useEffect(() => {
    loadData();
  }, []);

  // currentDate 변경 시 해당 월 데이터 로드
  useEffect(() => {
    if (viewMode === 'day' || viewMode === 'week') {
      loadData();
    }
  }, [currentDate, viewMode]);

  // URL 쿼리 파라미터 처리
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      
      if (viewParam && (viewParam === 'month' || viewParam === 'week' || viewParam === 'day')) {
        setViewMode(viewParam);
        
        // 주별 뷰일 때 이번주로 설정
        if (viewParam === 'week') {
          setCurrentDate(new Date());
        }
      }
    }
  }, []);

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.autocomplete-container')) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 다이얼로그가 열릴 때 기존 메뉴들을 임시 리스트에 로드
  useEffect(() => {
    if (isDialogOpen && selectedDate && selectedMealType) {
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      const existingMeal = familyMeals.find(fm => fm.date === dateKey);
      if (existingMeal) {
        const mealType = selectedMealType as 'breakfast' | 'lunch' | 'dinner';
        const menus = existingMeal[mealType] || [];
        const menuArray = Array.isArray(menus) ? menus : [];
        setTempMenuList(menuArray);
        // 수정창에서는 텍스트박스를 비워두고 임시 리스트에만 표시
        setMealName('');
      } else {
        // 해당 날짜에 식단이 없는 경우
        setTempMenuList([]);
        setMealName('');
      }
    }
  }, [isDialogOpen, selectedDate, selectedMealType, familyMeals]);

  // mealName 상태 변화 추적 및 엔터키 입력 감지
  useEffect(() => {
    if (lastEnterPressed && mealName.trim()) {
      const currentMealName = mealName.trim();
      // 상태를 즉시 비우기
      setMealName('');
      // 메뉴 추가
      addToTempList(currentMealName);
      // 엔터키 플래그 초기화
      setLastEnterPressed(false);
    }
  }, [mealName, lastEnterPressed]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [familyMealsData, mealsData] = await Promise.all([
        familyMealsApi.getByMonth(new Date().getFullYear(), new Date().getMonth() + 1),
        mealsApi.getAll()
      ]);
      setFamilyMeals(familyMealsData);
      setAvailableMeals(mealsData.filter(meal => meal.status));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 자동완성용 필터링 (현재 입력된 텍스트와 일치하는 메뉴들)
  const filteredAutocomplete = typeof mealName === 'string' && mealName.length >= 1 ? availableMeals.filter(meal =>
    meal.meal_name.toLowerCase().includes(mealName.toLowerCase())
  ).slice(0, 8) : []; // 최대 8개까지만 표시, 1글자 이상 입력 시에만 표시

  // 임시 리스트에 메뉴 추가
  const addToTempList = (menuName: string) => {
    const trimmedName = menuName.trim();
    
    // 빈 문자열 체크
    if (!trimmedName) {
      return;
    }
    
    // 중복 체크 강화
    if (tempMenuList.includes(trimmedName)) {
      return;
    }
    
    // 메뉴 추가
    setTempMenuList(prev => [...prev, trimmedName]);
  };

  // 임시 리스트에서 메뉴 제거
  const removeFromTempList = (menuName: string) => {
    setTempMenuList(prev => prev.filter(menu => menu !== menuName));
  };

  // 체크 버튼 클릭 시 임시 리스트에 추가
  const handleAddToTempList = () => {
    if (mealName.trim()) {
      const currentMealName = mealName.trim();
      // 상태를 즉시 비우기
      setMealName('');
      // 약간의 지연 후 메뉴 추가 (상태 업데이트 완료 대기)
      requestAnimationFrame(() => {
        addToTempList(currentMealName);
      });
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      // 해당 날짜의 기존 메뉴들을 미리 로드
      const dateKey = format(date, "yyyy-MM-dd");
      const existingMeal = familyMeals.find(fm => fm.date === dateKey);
      if (existingMeal) {
        setSelectedMeals({
          breakfast: Array.isArray(existingMeal.breakfast) ? existingMeal.breakfast : [],
          lunch: Array.isArray(existingMeal.lunch) ? existingMeal.lunch : [],
          dinner: Array.isArray(existingMeal.dinner) ? existingMeal.dinner : []
        });
      } else {
        setSelectedMeals({
          breakfast: [],
          lunch: [],
          dinner: []
        });
      }
      // 임시 리스트 초기화
      setTempMenuList([]);
      setMealName('');
      setIsDialogOpen(true);
    }
  };

  const handleSaveMeal = async () => {
    console.log('handleSaveMeal 호출됨:', { selectedDate, selectedMealType, tempMenuList });
    
    if (!selectedDate || !selectedMealType || tempMenuList.length === 0) {
      console.log('저장 조건 불충족:', { selectedDate, selectedMealType, tempMenuListLength: tempMenuList.length });
      toast({
        title: "저장할 수 없습니다",
        description: "날짜, 식사 시간, 메뉴를 모두 선택해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true); // 저장 시작

    try {
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      const existingMeal = familyMeals.find(fm => fm.date === dateKey);
      console.log('기존 식단:', existingMeal);
      
      // 신규 메뉴들을 식단리스트에 자동 추가
      for (const menuName of tempMenuList) {
        const isNewMeal = !availableMeals.some(meal => 
          meal.meal_name.toLowerCase() === menuName.toLowerCase()
        );
        
        if (isNewMeal) {
          try {
            const newMealData = {
              meal_name: menuName,
              family_preference: "Not Yet" as const, // 기본값
              status: true, // 캘린더 노출 기본값
            };
            
            await mealsApi.create(newMealData);
            console.log('신규 메뉴가 식단리스트에 자동 추가되었습니다:', menuName);
          } catch (mealCreateError) {
            console.warn('신규 메뉴 자동 추가 실패:', mealCreateError);
            // 신규 메뉴 추가 실패해도 가족 식단 저장은 계속 진행
          }
        }
      }
      
      // 중복 체크 강화 - 기존 메뉴와 새 메뉴를 합치되 중복 제거
      const getUniqueMenus = (existingMenus: string[] | null, newMenus: string[]) => {
        if (!existingMenus || !Array.isArray(existingMenus)) return newMenus;
        
        const existingSet = new Set(existingMenus.map(menu => menu.toLowerCase()));
        const uniqueNewMenus = newMenus.filter(menu => !existingSet.has(menu.toLowerCase()));
        
        // 기존 메뉴 + 새로운 고유 메뉴
        return [...existingMenus, ...uniqueNewMenus];
      };

      const mealData = {
        date: dateKey,
        breakfast: selectedMealType === 'breakfast' ? tempMenuList : (existingMeal?.breakfast || []),
        lunch: selectedMealType === 'lunch' ? tempMenuList : (existingMeal?.lunch || []),
        dinner: selectedMealType === 'dinner' ? tempMenuList : (existingMeal?.dinner || []),
      };

      console.log('저장할 식단 데이터:', mealData);
      await familyMealsApi.upsert(mealData);
      console.log('가족 식단 저장 완료');
      
      await loadData(); // 데이터 다시 로드하여 신규 메뉴도 포함
      console.log('데이터 다시 로드 완료');

      // 성공 메시지
      toast({
        title: "저장 완료!",
        description: "식단이 성공적으로 저장되었습니다.",
        variant: "default",
      });

      // Reset form
      setSelectedMealType("");
      setMealName("");
      setTempMenuList([]);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save meal:', error);
      toast({
        title: "저장 실패",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false); // 저장 완료 (성공/실패 상관없이)
    }
  };

  const handleDialogClose = () => {
    setSelectedMealType("");
    setMealName("");
    setTempMenuList([]);
    setIsDialogOpen(false);
    setShowAutocomplete(false);
    setSelectedAutocompleteIndex(0);
  };

  const handleMealSelect = (mealName: string) => {
    addToTempList(mealName);
  };

  // 자동완성 관련 핸들러들
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMealName(value);
    
    // 1글자 이상 입력 시에만 자동완성 표시
    if (value.length >= 1) {
      setShowAutocomplete(true);
      setSelectedAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 자동완성이 열려있을 때만 화살표키와 이스케이프 처리
    if (!showAutocomplete || filteredAutocomplete.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedAutocompleteIndex(prev => 
          prev < filteredAutocomplete.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedAutocompleteIndex(prev => 
          prev > 0 ? prev - 1 : filteredAutocomplete.length - 1
        );
        break;
      case 'Escape':
        setShowAutocomplete(false);
        break;
    }
  };

  const handleAutocompleteSelect = (mealName: string) => {
    console.log('handleAutocompleteSelect 호출됨:', mealName);
    setMealName(mealName);
    setShowAutocomplete(false);
    console.log('자동완성 선택 완료, mealName 설정됨:', mealName);
  };

  const getMealForDate = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return familyMeals.find(fm => fm.date === dateKey);
  };

  // 주간 날짜들 가져오기
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 }); // 일요일부터 시작
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  };

  // 월간 날짜들 가져오기
  const getMonthDays = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  // 주간/월간 네비게이션
  const handleWeekNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(subDays(currentDate, 7));
    } else {
      setCurrentDate(addDays(currentDate, 7));
    }
  };

  const handleMonthNavigation = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(subDays(currentDate, 30));
    } else {
      setCurrentDate(addDays(currentDate, 30));
    }
  };

  // 식사 타입별 색상
  const getMealTypeColor = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'bg-blue-100 text-blue-800';
      case 'lunch': return 'bg-green-100 text-green-800';
      case 'dinner': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 식사 타입별 라벨
  const getMealTypeLabel = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return '아침';
      case 'lunch': return '점심';
      case 'dinner': return '저녁';
      default: return '';
    }
  };

  // 가족식단 정렬 함수 (날짜와 아침->점심->저녁 순서)
  const sortFamilyMeals = (mealsToSort: FamilyMeal[]) => {
    const sortedMeals = [...mealsToSort];
    
    return sortedMeals.sort((a, b) => {
      // 먼저 날짜로 정렬
      const dateComparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateComparison !== 0) return dateComparison;
      
      // 같은 날짜인 경우 아침, 점심, 저녁 순서로 정렬
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
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">가족 식단</h1>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              식단 추가
            </Button>
          </div>

          {/* 뷰 모드 선택 */}
          <div className="flex space-x-2 mb-6">
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
              <Clock className="mr-2 h-4 w-4" />
              주별
            </Button>
            <Button
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              월별
            </Button>
          </div>

          {/* 월별 뷰 */}
          {viewMode === 'month' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={() => handleMonthNavigation('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center">
                  <h2 className="text-lg font-semibold">
                    {format(currentDate, 'yyyy년 M월', { locale: ko })}
                  </h2>
                  {!isSameMonth(currentDate, new Date()) && (
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
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleMonthNavigation('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-6">
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
                    const dayMeals = getMealForDate(date);
                    const isCurrentDate = isToday(date);
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    
                    return (
                      <div
                        key={index}
                        className={`min-h-[140px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                          isCurrentDate ? 'bg-blue-50' : ''
                        } ${
                          !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                        }`}
                        onClick={() => {
                          if (isCurrentMonth) {
                            setSelectedDate(date);
                            setIsDialogOpen(true);
                          }
                        }}
                      >
                        <div className={`text-sm font-medium mb-1 ${
                          !isCurrentMonth ? 'text-gray-400' : ''
                        }`}>
                          {format(date, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayMeals && (
                            <>
                              {dayMeals.breakfast && (
                                <div className="p-1 rounded border text-xs bg-white">
                                  <div className="flex items-center space-x-1 mb-0.5">
                                    <Badge className={`text-xs ${getMealTypeColor('breakfast')} flex-shrink-0 px-1 py-0.5`}>
                                      아침
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-700 break-words leading-tight px-1">
                                    {Array.isArray(dayMeals.breakfast) 
                                      ? dayMeals.breakfast.map((menu, idx) => (
                                          <div key={idx} className="mb-1 last:mb-0">
                                            • {menu}
                                          </div>
                                        ))
                                      : dayMeals.breakfast
                                    }
                                  </div>
                                </div>
                              )}
                              {dayMeals.lunch && (
                                <div className="p-1 rounded border text-xs bg-white">
                                  <div className="flex items-center space-x-1 mb-0.5">
                                    <Badge className={`text-xs ${getMealTypeColor('lunch')} flex-shrink-0 px-1 py-0.5`}>
                                      점심
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-700 break-words leading-tight px-1">
                                    {Array.isArray(dayMeals.lunch) 
                                      ? dayMeals.lunch.map((menu, idx) => (
                                          <div key={idx} className="mb-1 last:mb-0">
                                            • {menu}
                                          </div>
                                        ))
                                      : dayMeals.lunch
                                    }
                                  </div>
                                </div>
                              )}
                              {dayMeals.dinner && (
                                <div className="p-1 rounded border text-xs bg-white">
                                  <div className="flex items-center space-x-1 mb-0.5">
                                    <Badge className={`text-xs ${getMealTypeColor('dinner')} flex-shrink-0 px-1 py-0.5`}>
                                      저녁
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-gray-700 break-words leading-tight px-1">
                                    {Array.isArray(dayMeals.dinner) 
                                      ? dayMeals.dinner.map((menu, idx) => (
                                          <div key={idx} className="mb-1 last:mb-0">
                                            • {menu}
                                          </div>
                                        ))
                                      : dayMeals.dinner
                                    }
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* 이번달 식단 리스트 */}
              {familyMeals.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                    <ChefHat className="h-5 w-5 mr-2" />
                    이번달 식단
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {sortFamilyMeals(familyMeals).map((meal) => {
                      const isToday = format(new Date(meal.date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      return (
                        <div key={meal.id} className={`p-3 rounded-lg border ${
                          isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-green-200'
                        }`}>
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="outline" className={`text-xs font-medium ${
                              isToday ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white'
                            }`}>
                              {format(new Date(meal.date), 'M월 d일 (E)', { locale: ko })}
                              {isToday && ' - 오늘'}
                            </Badge>
                          </div>
                        <div className="space-y-2">
                          {meal.breakfast && (
                            <div className="flex items-center space-x-2">
                              <Badge className="text-xs bg-blue-100 text-blue-800 w-12 text-center">아침</Badge>
                              <div className="text-sm text-gray-700 break-words">
                                {Array.isArray(meal.breakfast) 
                                  ? meal.breakfast.map((menu, idx) => (
                                      <div key={idx} className="mb-1 last:mb-0">
                                        • {menu}
                                      </div>
                                    ))
                                  : meal.breakfast
                                }
                              </div>
                            </div>
                          )}
                          {meal.lunch && (
                            <div className="flex items-center space-x-2">
                              <Badge className="text-xs bg-green-100 text-green-800 w-12 text-center">점심</Badge>
                              <div className="text-sm text-gray-700 break-words">
                                {Array.isArray(meal.lunch) 
                                  ? meal.lunch.map((menu, idx) => (
                                      <div key={idx} className="mb-1 last:mb-0">
                                        • {menu}
                                      </div>
                                    ))
                                  : meal.lunch
                                }
                              </div>
                            </div>
                          )}
                          {meal.dinner && (
                            <div className="flex items-center space-x-2">
                              <Badge className="text-xs bg-purple-100 text-purple-800 w-12 text-center">저녁</Badge>
                              <div className="text-sm text-gray-700 break-words">
                                {Array.isArray(meal.dinner) 
                                  ? meal.dinner.map((menu, idx) => (
                                      <div key={idx} className="mb-1 last:mb-0">
                                        • {menu}
                                      </div>
                                    ))
                                  : meal.dinner
                                }
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 주별 뷰 */}
          {viewMode === 'week' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <Button variant="outline" size="sm" onClick={() => handleWeekNavigation('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center">
                  <h2 className="text-lg font-semibold">
                    {format(getWeekDays()[0], 'yyyy년 M월 d일', { locale: ko })} ~ {format(getWeekDays()[6], 'M월 d일', { locale: ko })}
                  </h2>
                  {(() => {
                    const today = new Date();
                    const currentWeekStart = startOfWeek(today, { weekStartsOn: 0 });
                    const currentWeekEnd = endOfWeek(today, { weekStartsOn: 0 });
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
                  })()}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleWeekNavigation('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-6">
                {['일', '월', '화', '수', '목', '금', '토'].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-500 bg-gray-50">
                    {day}
                  </div>
                ))}
                {getWeekDays().map((date, index) => {
                  const dayMeals = getMealForDate(date);
                  const isCurrentDate = isToday(date);
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-[160px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                        isCurrentDate ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => {
                        setSelectedDate(date);
                        setIsDialogOpen(true);
                      }}
                    >
                      <div className="text-sm font-medium mb-1">
                        {format(date, 'd')}
                      </div>
                      <div className="space-y-1">
                        {dayMeals && (
                          <>
                            {dayMeals.breakfast && (
                              <div className="p-1 rounded border text-xs bg-white">
                                <div className="flex items-center space-x-1 mb-0.5">
                                  <Badge className={`text-xs ${getMealTypeColor('breakfast')} flex-shrink-0 px-1 py-0.5`}>
                                    아침
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-700 break-words leading-tight px-1">
                                  {Array.isArray(dayMeals.breakfast) 
                                    ? dayMeals.breakfast.map((menu, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                          • {menu}
                                        </div>
                                      ))
                                    : dayMeals.breakfast
                                  }
                                </div>
                              </div>
                            )}
                            {dayMeals.lunch && (
                              <div className="p-1 rounded border text-xs bg-white">
                                <div className="flex items-center space-x-1 mb-0.5">
                                  <Badge className={`text-xs ${getMealTypeColor('lunch')} flex-shrink-0 px-1 py-0.5`}>
                                    점심
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-700 break-words leading-tight px-1">
                                  {Array.isArray(dayMeals.lunch) 
                                    ? dayMeals.lunch.map((menu, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                          • {menu}
                                        </div>
                                      ))
                                    : dayMeals.lunch
                                  }
                                </div>
                              </div>
                            )}
                            {dayMeals.dinner && (
                              <div className="p-1 rounded border text-xs bg-white">
                                <div className="flex items-center space-x-1 mb-0.5">
                                  <Badge className={`text-xs ${getMealTypeColor('dinner')} flex-shrink-0 px-1 py-0.5`}>
                                    저녁
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-700 break-words leading-tight px-1">
                                  {Array.isArray(dayMeals.dinner) 
                                    ? dayMeals.dinner.map((menu, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                          • {menu}
                                        </div>
                                      ))
                                    : dayMeals.dinner
                                  }
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* 이번주 식단 리스트 */}
              {(() => {
                // 이번주의 모든 날짜를 일요일부터 토요일까지 생성
                // 수동으로 일요일 계산 (0: 일요일, 1: 월요일, ..., 6: 토요일)
                const currentDayOfWeek = currentDate.getDay(); // 0: 일요일, 1: 월요일, ...
                const daysFromSunday = currentDayOfWeek; // 현재 날짜가 일요일로부터 며칠 떨어져 있는지
                const weekStart = subDays(currentDate, daysFromSunday); // 일요일로 이동
                
                const weekDays = [];
                for (let i = 0; i < 7; i++) {
                  weekDays.push(addDays(weekStart, i));
                }
                
                // 각 날짜에 해당하는 식단을 찾아서 순서대로 표시
                const weekMealsWithDates = weekDays.map(date => {
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const meal = familyMeals.find(fm => fm.date === dateKey);
                  return {
                    date: dateKey,
                    displayDate: date,
                    meal: meal
                  };
                });
                
                // 식단이 있는 날짜가 하나라도 있는지 확인
                const hasMeals = weekMealsWithDates.some(item => item.meal);
                
                return hasMeals ? (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                      <ChefHat className="h-5 w-5 mr-2" />
                      이번주 식단
                    </h4>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {weekMealsWithDates.map((item) => {
                        const isToday = format(item.displayDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                        return (
                          <div key={item.date} className={`p-3 rounded-lg border ${
                            isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-green-200'
                          }`}>
                            <div className="flex items-center space-x-2 mb-2">
                              <Badge variant="outline" className={`text-xs font-medium ${
                                isToday ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-white'
                              }`}>
                                {format(item.displayDate, 'M월 d일 (E)', { locale: ko })}
                                {isToday && ' - 오늘'}
                              </Badge>
                            </div>
                          <div className="space-y-2">
                            {item.meal ? (
                              <>
                                {item.meal.breakfast && (
                                  <div className="flex items-center space-x-2">
                                    <Badge className="text-xs bg-blue-100 text-blue-800 w-12 text-center">아침</Badge>
                                    <div className="text-sm text-gray-700 break-words">
                                      {Array.isArray(item.meal.breakfast) 
                                        ? item.meal.breakfast.map((menu, idx) => (
                                            <div key={idx} className="mb-1 last:mb-0">
                                              • {menu}
                                            </div>
                                          ))
                                        : item.meal.breakfast
                                      }
                                    </div>
                                  </div>
                                )}
                                {item.meal.lunch && (
                                  <div className="flex items-center space-x-2">
                                    <Badge className="text-xs bg-green-100 text-green-800 w-12 text-center">점심</Badge>
                                    <div className="text-sm text-gray-700 break-words">
                                      {Array.isArray(item.meal.lunch) 
                                        ? item.meal.lunch.map((menu, idx) => (
                                            <div key={idx} className="mb-1 last:mb-0">
                                              • {menu}
                                          </div>
                                        ))
                                        : item.meal.lunch
                                      }
                                    </div>
                                  </div>
                                )}
                                {item.meal.dinner && (
                                  <div className="flex items-center space-x-2">
                                    <Badge className="text-xs bg-purple-100 text-purple-800 w-12 text-center">저녁</Badge>
                                    <div className="text-sm text-gray-700 break-words">
                                      {Array.isArray(item.meal.dinner) 
                                        ? item.meal.dinner.map((menu, idx) => (
                                            <div key={idx} className="mb-1 last:mb-0">
                                              • {menu}
                                          </div>
                                        ))
                                        : item.meal.dinner
                                      }
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-center py-2 text-gray-400 text-sm">
                                등록된 식단이 없습니다
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* 일별 뷰 */}
          {viewMode === 'day' && (
            <div className="mb-6">
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-4">
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex flex-col items-center">
                    <h3 className="text-base font-semibold">
                      {format(currentDate, 'yyyy년 M월 d일 (EEEE)', { locale: ko })}
                    </h3>
                    {!isToday(currentDate) && (
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
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {(() => {
                    const dayMeals = getMealForDate(currentDate);
                    if (!dayMeals) {
                      return (
                        <div className="text-center py-8 text-gray-500">
                          <div>이 날의 식단이 없습니다.</div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedDate(currentDate);
                              setIsDialogOpen(true);
                            }}
                            className="mt-2"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            식단 추가하기
                          </Button>
                        </div>
                      );
                    }
                    
                    return (
                      <>
                        {dayMeals.breakfast && (
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <Badge className={`flex-shrink-0 ${getMealTypeColor('breakfast')}`}>
                                아침
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <div className="min-w-0 flex-1">
                                  {Array.isArray(dayMeals.breakfast) 
                                    ? dayMeals.breakfast.map((menu, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                          • {menu}
                                        </div>
                                      ))
                                    : <h4 className="font-medium truncate">{dayMeals.breakfast}</h4>
                                  }
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDate(currentDate);
                                  setSelectedMealType('breakfast');
                                  setMealName(Array.isArray(dayMeals.breakfast) ? dayMeals.breakfast.join(', ') : (dayMeals.breakfast || ''));
                                  setIsDialogOpen(true);
                                }}
                              >
                                수정
                              </Button>
                            </div>
                          </div>
                        )}
                        {dayMeals.lunch && (
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <Badge className={`flex-shrink-0 ${getMealTypeColor('lunch')}`}>
                                점심
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <div className="min-w-0 flex-1">
                                  {Array.isArray(dayMeals.lunch) 
                                    ? dayMeals.lunch.map((menu, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                          • {menu}
                                        </div>
                                      ))
                                    : <h4 className="font-medium truncate">{dayMeals.lunch}</h4>
                                  }
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDate(currentDate);
                                  setSelectedMealType('lunch');
                                  setMealName(Array.isArray(dayMeals.lunch) ? dayMeals.lunch.join(', ') : (dayMeals.lunch || ''));
                                  setIsDialogOpen(true);
                                }}
                              >
                                수정
                              </Button>
                            </div>
                          </div>
                        )}
                        {dayMeals.dinner && (
                          <div className="flex items-center justify-between p-3 rounded-lg border bg-white">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <Badge className={`flex-shrink-0 ${getMealTypeColor('dinner')}`}>
                                저녁
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <div className="min-w-0 flex-1">
                                  {Array.isArray(dayMeals.dinner) 
                                    ? dayMeals.dinner.map((menu, idx) => (
                                        <div key={idx} className="mb-1 last:mb-0">
                                          • {menu}
                                        </div>
                                      ))
                                    : <h4 className="font-medium truncate">{dayMeals.dinner}</h4>
                                  }
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDate(currentDate);
                                  setSelectedMealType('dinner');
                                  setMealName(Array.isArray(dayMeals.dinner) ? dayMeals.dinner.join(', ') : (dayMeals.dinner || ''));
                                  setIsDialogOpen(true);
                                }}
                              >
                                수정
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
              
              {/* 오늘의 식단 */}
              {(() => {
                const todayMeal = getMealForDate(currentDate);
                return todayMeal && (todayMeal.breakfast || todayMeal.lunch || todayMeal.dinner) ? (
                  <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                      <ChefHat className="h-5 w-5 mr-2" />
                      오늘의 식단
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {todayMeal.breakfast && (
                        <div className="p-4 bg-white rounded-lg border border-blue-200">
                          <div className="flex items-center justify-center mb-2">
                            <Badge className="text-sm bg-blue-100 text-blue-800 px-3 py-1">🌅 아침</Badge>
                          </div>
                          <div className="text-lg font-medium text-gray-800 break-words text-center">
                            {Array.isArray(todayMeal.breakfast) 
                              ? todayMeal.breakfast.map((menu, idx) => (
                                  <div key={idx} className="mb-2 last:mb-0">
                                    • {menu}
                                  </div>
                                ))
                              : todayMeal.breakfast
                            }
                          </div>
                        </div>
                      )}
                      {todayMeal.lunch && (
                        <div className="p-4 bg-white rounded-lg border border-green-200">
                          <div className="flex items-center justify-center mb-2">
                            <Badge className="text-sm bg-green-100 text-green-800 px-3 py-1">☀️ 점심</Badge>
                          </div>
                          <div className="text-lg font-medium text-gray-800 break-words text-center">
                            {Array.isArray(todayMeal.lunch) 
                              ? todayMeal.lunch.map((menu, idx) => (
                                  <div key={idx} className="mb-2 last:mb-0">
                                    • {menu}
                                  </div>
                                ))
                              : todayMeal.lunch
                            }
                          </div>
                        </div>
                      )}
                      {todayMeal.dinner && (
                        <div className="p-4 bg-white rounded-lg border border-purple-200">
                          <div className="flex items-center justify-center mb-2">
                            <Badge className="text-sm bg-purple-100 text-purple-800 px-3 py-1">🌙 저녁</Badge>
                          </div>
                          <div className="text-lg font-medium text-gray-800 break-words text-center">
                            {Array.isArray(todayMeal.dinner) 
                              ? todayMeal.dinner.map((menu, idx) => (
                                  <div key={idx} className="mb-2 last:mb-0">
                                    • {menu}
                                  </div>
                                ))
                              : todayMeal.dinner
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>식단 등록</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  날짜
                </label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  locale={ko}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-3 block">
                  식사 시간
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMealType('breakfast');
                      // 아침 메뉴들을 임시 리스트에 로드
                      const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
                      const existingMeal = familyMeals.find(fm => fm.date === dateKey);
                      const breakfastMenus = existingMeal?.breakfast || [];
                      const menus = Array.isArray(breakfastMenus) ? breakfastMenus : [];
                      setTempMenuList(menus);
                      // 수정창에서는 텍스트박스를 비워두고 임시 리스트에만 표시
                      setMealName('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedMealType === 'breakfast'
                        ? 'bg-blue-100 border-blue-300 shadow-md scale-105'
                        : 'bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🌅</div>
                      <div className="font-medium text-blue-800">아침</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMealType('lunch');
                      // 점심 메뉴들을 임시 리스트에 로드
                      const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
                      const existingMeal = familyMeals.find(fm => fm.date === dateKey);
                      const lunchMenus = existingMeal?.lunch || [];
                      const menus = Array.isArray(lunchMenus) ? lunchMenus : [];
                      setTempMenuList(menus);
                      // 수정창에서는 텍스트박스를 비워두고 임시 리스트에만 표시
                      setMealName('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedMealType === 'lunch'
                        ? 'bg-green-100 border-green-300 shadow-md scale-105'
                        : 'bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">☀️</div>
                      <div className="font-medium text-green-800">점심</div>
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMealType('dinner');
                      // 저녁 메뉴들을 임시 리스트에 로드
                      const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
                      const existingMeal = familyMeals.find(fm => fm.date === dateKey);
                      const dinnerMenus = existingMeal?.dinner || [];
                      const menus = Array.isArray(dinnerMenus) ? dinnerMenus : [];
                      setTempMenuList(menus);
                      // 수정창에서는 텍스트박스를 비워두고 임시 리스트에만 표시
                      setMealName('');
                    }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      selectedMealType === 'dinner'
                        ? 'bg-purple-100 border-purple-300 shadow-md scale-105'
                        : 'bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">🌙</div>
                      <div className="font-medium text-purple-800">저녁</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  메뉴
                </label>
                <div className="space-y-2">
                  <div className="relative autocomplete-container" style={{ position: 'relative', zIndex: 1000 }}>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          placeholder="메뉴를 입력하거나 아래에서 선택하세요"
                          value={mealName}
                          onChange={handleInputChange}
                          onKeyUp={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              // 엔터키 플래그 설정
                              setLastEnterPressed(true);
                            }
                          }}
                          onBlur={() => {
                            // 포커스를 잃을 때 자동완성 닫기
                            setShowAutocomplete(false);
                          }}


                          onFocus={() => setShowAutocomplete(true)}
                          className="pr-10"
                        />
                        {mealName && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setMealName("")}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 text-gray-500"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddToTempList}
                        disabled={!mealName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        ✓
                      </Button>
                    </div>
                    
                    {/* 자동완성 드롭다운 */}
                    {showAutocomplete && mealName.length >= 1 && filteredAutocomplete.length > 0 && (
                      <div 
                        className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-[9999] max-h-48 overflow-y-auto"
                        style={{ position: 'absolute', zIndex: 9999 }}
                      >
                        {filteredAutocomplete.map((meal, index) => (
                          <div
                            key={meal.id}
                            className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none active:bg-gray-100 touch-manipulation cursor-pointer select-none border-b border-gray-100 last:border-b-0 ${
                              index === selectedAutocompleteIndex ? 'bg-gray-100' : ''
                            }`}
                            onMouseEnter={() => setSelectedAutocompleteIndex(index)}
                            onClick={() => {
                              console.log('자동완성 메뉴 클릭됨:', meal.meal_name);
                              handleAutocompleteSelect(meal.meal_name);
                            }}
                            onMouseDown={() => {
                              console.log('자동완성 메뉴 마우스다운됨:', meal.meal_name);
                              handleAutocompleteSelect(meal.meal_name);
                            }}
                            onPointerDown={() => {
                              console.log('자동완성 메뉴 포인터다운됨:', meal.meal_name);
                              handleAutocompleteSelect(meal.meal_name);
                            }}
                            onTouchStart={() => {
                              console.log('자동완성 메뉴 터치됨:', meal.meal_name);
                              handleAutocompleteSelect(meal.meal_name);
                            }}
                          >
                            <div className="font-medium text-gray-900">{meal.meal_name}</div>
                            <div className="text-xs text-gray-500">
                              호응도: {meal.family_preference}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* 임시 메뉴 리스트 */}
                  <div className="mt-4">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      선택된 식단 (임시)
                    </label>
                    {tempMenuList.length > 0 ? (
                      <div className="space-y-2">
                        {tempMenuList.map((menu, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                            <span className="text-sm text-gray-700">{menu}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromTempList(menu)}
                              className="h-6 w-6 p-0 hover:bg-red-100 text-red-500"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                        메뉴를 추가해주세요
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mb-2">기존 메뉴에서 선택:</div>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {availableMeals.map((meal) => (
                      <Button
                        key={meal.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleMealSelect(meal.meal_name)}
                        className="text-xs h-8"
                      >
                        {meal.meal_name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleDialogClose} disabled={isSaving}>
                  취소
                </Button>
                <Button onClick={handleSaveMeal} disabled={isSaving}>
                  {isSaving ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
} 