"use client";

import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, ChefHat, Eye } from "lucide-react";
import { recipesApi, Recipe } from "@/lib/supabase-client";

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    ingredients: "",
    instructions: "",
    images: [] as string[],
  });

  // 데이터 로드
  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      setLoading(true);
      const data = await recipesApi.getAll();
      setRecipes(data);
    } catch (error) {
      console.error('Failed to load recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      ingredients: "",
      instructions: "",
      images: [],
    });
    setEditingRecipe(null);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return;

    try {
      if (editingRecipe) {
        await recipesApi.update(editingRecipe.id, formData);
      } else {
        await recipesApi.create(formData);
      }
      
      // 데이터 다시 로드
      await loadRecipes();
      
      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Failed to save recipe:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setFormData({
      title: recipe.title,
      content: recipe.content,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions,
      images: recipe.images,
    });
    setIsDialogOpen(true);
  };

  const handleViewDetail = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsDetailDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      await recipesApi.delete(id);
      await loadRecipes();
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      alert('삭제에 실패했습니다.');
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

  const handleDetailDialogClose = () => {
    setSelectedRecipe(null);
    setIsDetailDialogOpen(false);
  };

  const handleImagesChange = (images: string[]) => {
    setFormData({ ...formData, images });
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
            <h1 className="text-3xl font-bold text-gray-900">레시피</h1>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  레시피 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingRecipe ? "레시피 수정" : "새 레시피 추가"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      제목
                    </label>
                    <Input
                      placeholder="레시피 제목을 입력하세요"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      설명
                    </label>
                    <Textarea
                      placeholder="레시피에 대한 간단한 설명을 입력하세요"
                      value={formData.content}
                      onChange={(e) => setFormData({...formData, content: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      재료
                    </label>
                    <Textarea
                      placeholder="재료를 쉼표로 구분하여 입력하세요 (예: 돼지고기, 김치, 두부)"
                      value={formData.ingredients}
                      onChange={(e) => setFormData({...formData, ingredients: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      요리 방법
                    </label>
                    <Textarea
                      placeholder="단계별로 요리 방법을 입력하세요"
                      value={formData.instructions}
                      onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                      rows={6}
                    />
                  </div>

                  {/* 이미지 업로드 컴포넌트 */}
                  <ImageUpload
                    images={formData.images}
                    onImagesChange={handleImagesChange}
                    maxImages={5}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={handleDialogClose}>
                      취소
                    </Button>
                    <Button onClick={handleSave}>
                      {editingRecipe ? "수정" : "추가"}
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
                placeholder="레시피 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Recipes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <ChefHat className="h-5 w-5 text-orange-500" />
                      <CardTitle className="text-lg">{recipe.title}</CardTitle>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(recipe)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(recipe)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(recipe.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {recipe.content}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* 이미지 미리보기 */}
                    {recipe.images.length > 0 && (
                      <div className="mb-3">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">이미지</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {recipe.images.slice(0, 2).map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`레시피 이미지 ${index + 1}`}
                              className="w-full h-20 object-cover rounded"
                            />
                          ))}
                          {recipe.images.length > 2 && (
                            <div className="w-full h-20 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                              +{recipe.images.length - 2}개 더
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">재료</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {recipe.ingredients}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-gray-700 mb-1">요리 방법</h4>
                      <p className="text-sm text-gray-600 line-clamp-3">
                        {recipe.instructions}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecipes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? "검색 결과가 없습니다." : "등록된 레시피가 없습니다."}
            </div>
          )}
        </div>

        {/* 상세보기 모달 */}
        <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {selectedRecipe?.title}
              </DialogTitle>
            </DialogHeader>
            {selectedRecipe && (
              <div className="space-y-6">
                {/* 설명 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">설명</h3>
                  <p className="text-gray-700">{selectedRecipe.content}</p>
                </div>

                {/* 이미지 */}
                {selectedRecipe.images.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">이미지</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedRecipe.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={image}
                            alt={`레시피 이미지 ${index + 1}`}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 재료 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">재료</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line">{selectedRecipe.ingredients}</p>
                  </div>
                </div>

                {/* 요리 방법 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">요리 방법</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 whitespace-pre-line">{selectedRecipe.instructions}</p>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <Button variant="outline" onClick={handleDetailDialogClose}>
                    닫기
                  </Button>
                  <Button onClick={() => {
                    handleDetailDialogClose();
                    handleEdit(selectedRecipe);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    수정하기
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
} 