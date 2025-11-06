"use client";

import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ImageUpload";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, ChevronUp, ChevronDown, History, AlertTriangle } from "lucide-react";
import { suppliesApi, Supply, SupplyHistory } from "@/lib/supabase-client";
import { useToast } from "@/hooks/use-toast";

export default function SuppliesPage() {
  const { toast } = useToast();
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState<Supply | null>(null);
  const [selectedSupply, setSelectedSupply] = useState<Supply | null>(null);
  const [supplyHistory, setSupplyHistory] = useState<SupplyHistory[]>([]);
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    images: [] as string[],
    howto: "",
    buy_date: getTodayDate(),
    remain_count: 0,
    deposit_description: "",
    deposit_images: [] as string[],
    buy_information: "",
  });

  // 데이터 로드
  useEffect(() => {
    loadSupplies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSupplies = async () => {
    try {
      setLoading(true);
      const data = await suppliesApi.getAll();
      setSupplies(data);
    } catch (error) {
      console.error('Failed to load supplies:', error);
      toast({
        title: "오류",
        description: "생필품 목록을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredSupplies = supplies.filter(supply =>
    supply.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supply.description && supply.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      images: [],
      howto: "",
      buy_date: getTodayDate(),
      remain_count: 0,
      deposit_description: "",
      deposit_images: [],
      buy_information: "",
    });
    setEditingSupply(null);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleDetailDialogOpenChange = (open: boolean) => {
    setIsDetailDialogOpen(open);
    if (!open) {
      setSelectedSupply(null);
    }
  };

  const handleHistoryDialogOpenChange = (open: boolean) => {
    setIsHistoryDialogOpen(open);
    if (!open) {
      setSupplyHistory([]);
    }
  };

  const handleEdit = (supply: Supply) => {
    setEditingSupply(supply);
    setFormData({
      title: supply.title,
      description: supply.description || "",
      images: supply.images || [],
      howto: supply.howto || "",
      buy_date: supply.buy_date || "",
      remain_count: supply.remain_count || 0,
      deposit_description: supply.deposit_description || "",
      deposit_images: supply.deposit_images || [],
      buy_information: supply.buy_information || "",
    });
    setIsDialogOpen(true);
  };

  const handleViewDetail = (supply: Supply) => {
    setSelectedSupply(supply);
    setIsDetailDialogOpen(true);
  };

  const handleViewHistory = async (supply: Supply) => {
    try {
      const history = await suppliesApi.getHistory(supply.title);
      setSupplyHistory(history);
      setSelectedSupply(supply);
      setIsHistoryDialogOpen(true);
    } catch (error) {
      console.error('Failed to load history:', error);
      toast({
        title: "오류",
        description: "구매 이력을 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "입력 오류",
        description: "생필품 이름을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingSupply) {
        // 수정 시 이력 저장됨 (API에서 처리)
        await suppliesApi.update(editingSupply.title, {
          description: formData.description || undefined,
          images: formData.images,
          howto: formData.howto || undefined,
          buy_date: formData.buy_date || undefined,
          remain_count: formData.remain_count,
          deposit_description: formData.deposit_description || undefined,
          deposit_images: formData.deposit_images,
          buy_information: formData.buy_information || undefined,
        });
        toast({
          title: "성공",
          description: "생필품이 수정되었습니다.",
        });
      } else {
        await suppliesApi.create({
          title: formData.title,
          description: formData.description || undefined,
          images: formData.images,
          howto: formData.howto || undefined,
          buy_date: formData.buy_date || undefined,
          remain_count: formData.remain_count,
          deposit_description: formData.deposit_description || undefined,
          deposit_images: formData.deposit_images,
          buy_information: formData.buy_information || undefined,
        });
        toast({
          title: "성공",
          description: "생필품이 추가되었습니다.",
        });
      }
      await loadSupplies();
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save supply:', error);
      const errorMessage = error instanceof Error ? error.message : "생필품 저장에 실패했습니다.";
      toast({
        title: "오류",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (supply: Supply) => {
    if (!confirm(`"${supply.title}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await suppliesApi.delete(supply.title);
      toast({
        title: "성공",
        description: "생필품이 삭제되었습니다.",
      });
      await loadSupplies();
    } catch (error) {
      console.error('Failed to delete supply:', error);
      toast({
        title: "오류",
        description: "생필품 삭제에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRemainCount = async (supply: Supply, delta: number) => {
    const newCount = Math.max(0, (supply.remain_count || 0) + delta);
    try {
      await suppliesApi.updateRemainCount(supply.title, newCount);
      await loadSupplies();
      if (selectedSupply && selectedSupply.title === supply.title) {
        setSelectedSupply({ ...selectedSupply, remain_count: newCount });
      }
    } catch (error) {
      console.error('Failed to update remain count:', error);
      toast({
        title: "오류",
        description: "재고 수량 업데이트에 실패했습니다.",
        variant: "destructive",
      });
    }
  };

  const handleImagesChange = (images: string[]) => {
    setFormData({ ...formData, images });
  };

  const handleDepositImagesChange = (images: string[]) => {
    setFormData({ ...formData, deposit_images: images });
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
            <h1 className="text-3xl font-bold text-gray-900">생필품</h1>
            <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  생필품 추가
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSupply ? "생필품 수정" : "새 생필품 추가"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      이름 <span className="text-red-500">*</span>
                      {editingSupply && <span className="text-xs text-gray-500 ml-2">(수정 불가)</span>}
                    </label>
                    <Input
                      placeholder="생필품 이름을 입력하세요"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      disabled={!!editingSupply}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      설명
                    </label>
                    <Textarea
                      placeholder="생필품에 대한 설명을 입력하세요"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      생필품 이미지
                    </label>
                    <ImageUpload
                      images={formData.images}
                      onImagesChange={handleImagesChange}
                      maxImages={5}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      용도
                    </label>
                    <Textarea
                      placeholder="생필품의 용도를 입력하세요"
                      value={formData.howto}
                      onChange={(e) => setFormData({...formData, howto: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      구매일
                    </label>
                    <Input
                      type="date"
                      value={formData.buy_date || getTodayDate()}
                      onChange={(e) => setFormData({...formData, buy_date: e.target.value})}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      {editingSupply ? "재고수량" : "구매수량"}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder={editingSupply ? "재고 수량을 입력하세요" : "구매 수량을 입력하세요"}
                      value={formData.remain_count === 0 ? "" : formData.remain_count}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData({...formData, remain_count: value === "" ? 0 : parseInt(value) || 0});
                      }}
                      onBlur={(e) => {
                        if (e.target.value === "") {
                          setFormData({...formData, remain_count: 0});
                        }
                      }}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      보관위치
                    </label>
                    <Textarea
                      placeholder="보관위치를 입력하세요"
                      value={formData.deposit_description}
                      onChange={(e) => setFormData({...formData, deposit_description: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      보관위치 이미지
                    </label>
                    <ImageUpload
                      images={formData.deposit_images}
                      onImagesChange={handleDepositImagesChange}
                      maxImages={5}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      구매정보
                    </label>
                    <Textarea
                      placeholder="구매 상세 정보, 수량, 금액, 사이트 등을 입력하세요"
                      value={formData.buy_information}
                      onChange={(e) => setFormData({...formData, buy_information: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleSave}>
                      {editingSupply ? "수정" : "추가"}
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
                placeholder="생필품 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Supplies List */}
          {filteredSupplies.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-gray-500">등록된 생필품이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSupplies.map((supply) => {
                const isLowStock = (supply.remain_count || 0) <= 1;
                return (
                  <Card
                    key={supply.id}
                    className={`cursor-pointer hover:shadow-lg transition-shadow ${
                      isLowStock ? 'border-red-300 bg-red-50' : ''
                    }`}
                    onClick={() => handleViewDetail(supply)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {supply.title}
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </CardTitle>
                          {supply.description && (
                            <CardDescription className="mt-1 line-clamp-2">
                              {supply.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {supply.images && supply.images.length > 0 && (
                        <div className="mb-3">
                          <img
                            src={supply.images[0]}
                            alt={supply.title}
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7snbTrr7jsp4DsnYw8L3RleHQ+Cjwvc3ZnPgo=';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600">재고수량:</span>
                        <Badge variant={isLowStock ? "destructive" : "default"}>
                          {supply.remain_count || 0}개
                        </Badge>
                      </div>
                      {supply.buy_date && (
                        <div className="text-sm text-gray-600 mb-2">
                          구매일: {new Date(supply.buy_date).toLocaleDateString('ko-KR')}
                        </div>
                      )}
                      <div className="flex justify-end space-x-2 mt-4" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(supply)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewHistory(supply)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(supply)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={handleDetailDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSupply?.title}</DialogTitle>
          </DialogHeader>
          {selectedSupply && (
            <div className="space-y-4">
              {selectedSupply.images && selectedSupply.images.length > 0 && (
                <div>
                  <img
                    src={selectedSupply.images[0]}
                    alt={selectedSupply.title}
                    className="w-full h-64 object-cover rounded-lg"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7snbTrr7jsp4DsnYw8L3RleHQ+Cjwvc3ZnPgo=';
                    }}
                  />
                </div>
              )}
              {selectedSupply.description && (
                <div>
                  <h3 className="font-semibold mb-1">설명</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedSupply.description}</p>
                </div>
              )}
              <div>
                <h3 className="font-semibold mb-2">재고수량</h3>
                <div className="flex items-center space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateRemainCount(selectedSupply, -1)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <span className="text-2xl font-bold">{selectedSupply.remain_count || 0}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateRemainCount(selectedSupply, 1)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {selectedSupply.howto && (
                <div>
                  <h3 className="font-semibold mb-1">용도</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedSupply.howto}</p>
                </div>
              )}
              {selectedSupply.buy_date && (
                <div>
                  <h3 className="font-semibold mb-1">구매일</h3>
                  <p className="text-gray-600">{new Date(selectedSupply.buy_date).toLocaleDateString('ko-KR')}</p>
                </div>
              )}
              {selectedSupply.deposit_description && (
                <div>
                  <h3 className="font-semibold mb-1">보관위치</h3>
                  <p className="text-gray-600">{selectedSupply.deposit_description}</p>
                </div>
              )}
              {selectedSupply.buy_information && (
                <div>
                  <h3 className="font-semibold mb-1">구매정보</h3>
                  <p className="text-gray-600 whitespace-pre-wrap">{selectedSupply.buy_information}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={handleHistoryDialogOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSupply?.title} 구매 이력</DialogTitle>
          </DialogHeader>
          {supplyHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">구매 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {supplyHistory.map((history) => (
                <Card key={history.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      {new Date(history.created_at).toLocaleString('ko-KR')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {history.buy_information && (
                      <div className="mb-2">
                        <span className="font-semibold">구매정보: </span>
                        <span className="text-gray-600 whitespace-pre-wrap">{history.buy_information}</span>
                      </div>
                    )}
                    {history.remain_count !== null && (
                      <div className="mb-2">
                        <span className="font-semibold">재고수량: </span>
                        <span className="text-gray-600">{history.remain_count}개</span>
                      </div>
                    )}
                    {history.buy_date && (
                      <div className="mb-2">
                        <span className="font-semibold">구매일: </span>
                        <span className="text-gray-600">
                          {new Date(history.buy_date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    )}
                    {history.description && (
                      <div className="mb-2">
                        <span className="font-semibold">설명: </span>
                        <span className="text-gray-600 whitespace-pre-wrap">{history.description}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

