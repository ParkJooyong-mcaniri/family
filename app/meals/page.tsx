"use client";

import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2 } from "lucide-react";
import { mealsApi, Meal } from "@/lib/supabase-client";

export default function MealsPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formData, setFormData] = useState({
    meal_name: "",
    family_preference: "Not Yet" as Meal['family_preference'],
    status: true,
  });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [selectedAutocompleteIndex, setSelectedAutocompleteIndex] = useState(0);

  const preferenceColors = {
    Good: "bg-green-100 text-green-800",
    "Not Bad": "bg-blue-100 text-blue-800",
    "So So": "bg-yellow-100 text-yellow-800",
    Bad: "bg-red-100 text-red-800",
    "Not Yet": "bg-gray-100 text-gray-800",
  };

  // 데이터 로드
  useEffect(() => {
    loadMeals();
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

  const loadMeals = async () => {
    try {
      setLoading(true);
      const data = await mealsApi.getAll();
      setMeals(data);
    } catch (error) {
      console.error('Failed to load meals:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeals = meals.filter(meal =>
    meal.meal_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 자동완성용 필터링 (현재 입력된 텍스트와 일치하는 메뉴들)
  const filteredAutocomplete = formData.meal_name.length >= 1 ? meals.filter(meal =>
    meal.meal_name.toLowerCase().includes(formData.meal_name.toLowerCase())
  ).slice(0, 8) : []; // 최대 8개까지만 표시, 1글자 이상 입력 시에만 표시

  const resetForm = () => {
    setFormData({
      meal_name: "",
      family_preference: "Not Yet",
      status: true,
    });
    setEditingMeal(null);
    setShowAutocomplete(false);
    setSelectedAutocompleteIndex(0);
  };

  const handleSave = async () => {
    if (!formData.meal_name.trim()) return;

    try {
      if (editingMeal) {
        await mealsApi.update(editingMeal.id, formData);
      } else {
        await mealsApi.create(formData);
      }
      
      // 데이터 다시 로드
      await loadMeals();
      
      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save meal:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setFormData({
      meal_name: meal.meal_name,
      family_preference: meal.family_preference,
      status: meal.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await mealsApi.delete(id);
      await loadMeals();
    } catch (error) {
      console.error('Failed to delete meal:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  // 자동완성 관련 핸들러들
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData({...formData, meal_name: value});
    
    // 1글자 이상 입력 시에만 자동완성 표시
    if (value.length >= 1) {
      setShowAutocomplete(true);
      setSelectedAutocompleteIndex(0);
    } else {
      setShowAutocomplete(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      case 'Enter':
        e.preventDefault();
        if (filteredAutocomplete[selectedAutocompleteIndex]) {
          setFormData({...formData, meal_name: filteredAutocomplete[selectedAutocompleteIndex].meal_name});
          setShowAutocomplete(false);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        break;
    }
  };

  const handleAutocompleteSelect = (mealName: string) => {
    setFormData({...formData, meal_name: mealName});
    setShowAutocomplete(false);
  };

  const handleClickOutside = () => {
    setShowAutocomplete(false);
  };

  const handleStatusToggle = async (id: string) => {
    const meal = meals.find(m => m.id === id);
    if (!meal) return;
    
    try {
      await mealsApi.update(id, { status: !meal.status });
      await loadMeals();
    } catch (error) {
      console.error('Failed to update meal status:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  const handleDialogClose = () => {
    resetForm();
    setIsDialogOpen(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    setIsDialogOpen(open);
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
            <h1 className="text-3xl font-bold text-gray-900">식단 리스트</h1>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  메뉴 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingMeal ? "메뉴 수정" : "새 메뉴 추가"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      요리명
                    </label>
                    <div className="relative autocomplete-container">
                      <Input
                        placeholder="요리명을 입력하세요"
                        value={formData.meal_name}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowAutocomplete(true)}
                        className="pr-10"
                      />
                      {formData.meal_name && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData({...formData, meal_name: ""})}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                        >
                          ×
                        </Button>
                      )}
                      
                      {/* 자동완성 드롭다운 */}
                      {showAutocomplete && formData.meal_name.length >= 1 && filteredAutocomplete.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                          {filteredAutocomplete.length > 0 ? (
                            filteredAutocomplete.map((meal, index) => (
                              <button
                                key={meal.id}
                                type="button"
                                onClick={() => handleAutocompleteSelect(meal.meal_name)}
                                className={`w-full text-left px-3 py-2 hover:bg-gray-50 focus:bg-gray-50 focus:outline-none ${
                                  index === selectedAutocompleteIndex ? 'bg-gray-100' : ''
                                }`}
                                onMouseEnter={() => setSelectedAutocompleteIndex(index)}
                              >
                                <div className="font-medium text-gray-900">{meal.meal_name}</div>
                                <div className="text-xs text-gray-500">
                                  호응도: {meal.family_preference}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-3 py-2 text-sm text-gray-500">
                              일치하는 메뉴가 없습니다
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      가족 호응도
                    </label>
                    <Select 
                      value={formData.family_preference} 
                      onValueChange={(value: Meal['family_preference']) => 
                        setFormData({...formData, family_preference: value})
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Not Bad">Not Bad</SelectItem>
                        <SelectItem value="So So">So So</SelectItem>
                        <SelectItem value="Bad">Bad</SelectItem>
                        <SelectItem value="Not Yet">Not Yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="status"
                      checked={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="status" className="text-sm font-medium text-gray-700">
                      캘린더에 노출
                    </label>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleDialogClose}>
                      취소
                    </Button>
                    <Button onClick={handleSave}>
                      {editingMeal ? "수정" : "추가"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="메뉴 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Meals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMeals.map((meal) => (
              <Card key={meal.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{meal.meal_name}</CardTitle>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(meal)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(meal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Badge className={preferenceColors[meal.family_preference]}>
                      {meal.family_preference}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={meal.status}
                        onChange={() => handleStatusToggle(meal.id)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">캘린더 노출</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMeals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "검색 결과가 없습니다." : "등록된 메뉴가 없습니다."}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 