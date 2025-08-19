"use client";

import { Navigation } from "@/components/Navigation";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, List } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addDays, subDays, isToday, isSameMonth } from "date-fns";
import { ko } from "date-fns/locale";
import { familyMealsApi, mealsApi, FamilyMeal, Meal } from "@/lib/supabase-client";

export default function FamilyMealsPage() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<string>("");
  const [mealName, setMealName] = useState("");
  const [familyMeals, setFamilyMeals] = useState<FamilyMeal[]>([]);
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setIsDialogOpen(true);
    }
  };

  const handleSaveMeal = async () => {
    if (!selectedDate || !selectedMealType || !mealName.trim()) return;

    try {
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      const existingMeal = familyMeals.find(fm => fm.date === dateKey);
      
      const mealData = {
        date: dateKey,
        breakfast: selectedMealType === 'breakfast' ? mealName.trim() : existingMeal?.breakfast || null,
        lunch: selectedMealType === 'lunch' ? mealName.trim() : existingMeal?.lunch || null,
        dinner: selectedMealType === 'dinner' ? mealName.trim() : existingMeal?.dinner || null,
      };

      await familyMealsApi.upsert(mealData);
      await loadData();

      // Reset form
      setSelectedMealType("");
      setMealName("");
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save meal:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDialogClose = () => {
    setSelectedMealType("");
    setMealName("");
    setIsDialogOpen(false);
  };

  const handleMealSelect = (mealName: string) => {
    setMealName(mealName);
  };

  const getMealForDate = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return familyMeals.find(fm => fm.date === dateKey);
  };

  // 주간 날짜들 가져오기
  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // 월요일부터 시작
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
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
              variant={viewMode === 'month' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('month')}
            >
              <CalendarDays className="mr-2 h-4 w-4" />
              월별
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
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              <List className="mr-2 h-4 w-4" />
              일별
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
                  <h2 className="text-xl font-semibold">
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
                        <div className="space-y-1.5">
                          {dayMeals && (
                            <>
                              {dayMeals.breakfast && (
                                <div className="flex items-center space-x-1 p-1.5 rounded border text-xs bg-white">
                                  <Badge className={`text-xs ${getMealTypeColor('breakfast')}`}>
                                    아침
                                  </Badge>
                                  <span className="truncate">{dayMeals.breakfast}</span>
                                </div>
                              )}
                              {dayMeals.lunch && (
                                <div className="flex items-center space-x-1 p-1.5 rounded border text-xs bg-white">
                                  <Badge className={`text-xs ${getMealTypeColor('lunch')}`}>
                                    점심
                                  </Badge>
                                  <span className="truncate">{dayMeals.lunch}</span>
                                </div>
                              )}
                              {dayMeals.dinner && (
                                <div className="flex items-center space-x-1 p-1.5 rounded border text-xs bg-white">
                                  <Badge className={`text-xs ${getMealTypeColor('dinner')}`}>
                                    저녁
                                  </Badge>
                                  <span className="truncate">{dayMeals.dinner}</span>
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
                  <h2 className="text-xl font-semibold">
                    {format(getWeekDays()[0], 'yyyy년 M월 d일', { locale: ko })} ~ {format(getWeekDays()[6], 'M월 d일', { locale: ko })}
                  </h2>
                  {(() => {
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
                  })()}
                </div>
                <Button variant="outline" size="sm" onClick={() => handleWeekNavigation('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-7 gap-1 mb-6">
                {['월', '화', '수', '목', '금', '토', '일'].map(day => (
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
                      <div className="space-y-1.5">
                        {dayMeals && (
                          <>
                            {dayMeals.breakfast && (
                              <div className="flex items-center space-x-1 p-1.5 rounded border text-xs bg-white">
                                <Badge className={`text-xs ${getMealTypeColor('breakfast')}`}>
                                  아침
                                </Badge>
                                <span className="truncate">{dayMeals.breakfast}</span>
                              </div>
                            )}
                            {dayMeals.lunch && (
                              <div className="flex items-center space-x-1 p-1.5 rounded border text-xs bg-white">
                                <Badge className={`text-xs ${getMealTypeColor('lunch')}`}>
                                  점심
                                </Badge>
                                <span className="truncate">{dayMeals.lunch}</span>
                              </div>
                            )}
                            {dayMeals.dinner && (
                              <div className="flex items-center space-x-1 p-1.5 rounded border text-xs bg-white">
                                <Badge className={`text-xs ${getMealTypeColor('dinner')}`}>
                                  저녁
                                </Badge>
                                <span className="truncate">{dayMeals.dinner}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                    <h3 className="text-lg font-semibold">
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
                                <h4 className="font-medium truncate">{dayMeals.breakfast}</h4>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDate(currentDate);
                                  setSelectedMealType('breakfast');
                                  setMealName(dayMeals.breakfast || '');
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
                                <h4 className="font-medium truncate">{dayMeals.lunch}</h4>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDate(currentDate);
                                  setSelectedMealType('lunch');
                                  setMealName(dayMeals.lunch || '');
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
                                <h4 className="font-medium truncate">{dayMeals.dinner}</h4>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedDate(currentDate);
                                  setSelectedMealType('dinner');
                                  setMealName(dayMeals.dinner || '');
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
            </div>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-md">
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
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  식사 시간
                </label>
                <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="식사 시간을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {mealTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  메뉴
                </label>
                <div className="space-y-2">
                  <Input
                    placeholder="메뉴를 입력하거나 아래에서 선택하세요"
                    value={mealName}
                    onChange={(e) => setMealName(e.target.value)}
                  />
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
                <Button variant="outline" onClick={handleDialogClose}>
                  취소
                </Button>
                <Button onClick={handleSaveMeal}>
                  저장
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
} 