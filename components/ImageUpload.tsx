"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { storageApi } from "@/lib/supabase-client";

interface ImageUploadProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export function ImageUpload({ images, onImagesChange, maxImages = 5 }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // 모바일 환경을 고려한 최적화된 크기 설정
          const maxWidth = window.innerWidth < 768 ? 600 : 800; // 모바일에서는 더 작게
          const maxHeight = window.innerWidth < 768 ? 450 : 600;
          
          let { width, height } = img;
          
          // 비율 유지하면서 리사이징
          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          // 모바일에서는 더 작은 크기로 조정
          if (window.innerWidth < 768 && (width > 400 || height > 300)) {
            if (width > height) {
              height = (height * 400) / width;
              width = 400;
            } else {
              width = (width * 300) / height;
              height = 300;
            }
          }

          canvas.width = width;
          canvas.height = height;

          if (ctx) {
            // 이미지 품질 향상을 위한 설정
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);
          }

          // 모바일에서는 더 낮은 품질로 압축하여 파일 크기 감소
          const quality = window.innerWidth < 768 ? 0.7 : 0.8;
          
          // Canvas를 Blob으로 변환
          canvas.toBlob((blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              reject(new Error('이미지 리사이징에 실패했습니다.'));
            }
          }, 'image/jpeg', quality);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('이미지 로드에 실패했습니다.'));
      };

      // 모바일에서 메모리 사용량 최적화
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > maxImages) {
      alert(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`);
      return;
    }

    setIsUploading(true);

    try {
      const newImageUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
          alert('이미지 파일만 업로드할 수 있습니다.');
          continue;
        }

        // 파일 크기 검증 (모바일에서는 더 작게)
        const maxFileSize = window.innerWidth < 768 ? 3 * 1024 * 1024 : 5 * 1024 * 1024; // 모바일: 3MB, 데스크톱: 5MB
        if (file.size > maxFileSize) {
          alert(`파일 크기는 ${window.innerWidth < 768 ? '3MB' : '5MB'} 이하여야 합니다.`);
          continue;
        }

        try {
          console.log('이미지 리사이징 시작:', file.name);
          
          // 이미지 리사이징
          const resizedFile = await resizeImage(file);
          console.log('이미지 리사이징 완료:', resizedFile.name, '크기:', resizedFile.size);
          
          // Supabase Storage에 업로드
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `recipes/${fileName}`;
          
          console.log('Storage 업로드 시작:', filePath);
          await storageApi.uploadImage(resizedFile, filePath);
          console.log('Storage 업로드 완료');
          
          // 공개 URL 가져오기
          const publicUrl = storageApi.getPublicUrl(filePath);
          console.log('공개 URL:', publicUrl);
          newImageUrls.push(publicUrl);
        } catch (uploadError) {
          console.error('개별 파일 업로드 실패:', file.name, uploadError);
          
          // 모바일에서 더 자세한 에러 메시지
          let errorMessage = '알 수 없는 오류';
          if (uploadError instanceof Error) {
            if (uploadError.message.includes('리사이징')) {
              errorMessage = '이미지 처리 중 오류가 발생했습니다. 다른 이미지를 시도해보세요.';
            } else if (uploadError.message.includes('업로드')) {
              errorMessage = '네트워크 연결을 확인하고 다시 시도해보세요.';
            } else {
              errorMessage = uploadError.message;
            }
          }
          
          alert(`파일 "${file.name}" 업로드에 실패했습니다: ${errorMessage}`);
          continue;
        }
      }

      if (newImageUrls.length > 0) {
        onImagesChange([...images, ...newImageUrls]);
        console.log('이미지 업로드 완료:', newImageUrls.length, '개');
      }
    } catch (error) {
      console.error('이미지 업로드 중 오류:', error);
      alert(`이미지 업로드 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = async (index: number) => {
    const imageUrl = images[index];
    
    try {
      // Supabase Storage에서 파일 삭제
      if (imageUrl.includes('recipe-images')) {
        const pathMatch = imageUrl.match(/recipe-images\/(.+)$/);
        if (pathMatch) {
          console.log('Storage에서 파일 삭제:', pathMatch[1]);
          await storageApi.deleteImage(pathMatch[1]);
          console.log('Storage 파일 삭제 완료');
        }
      }
      
      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);
    } catch (error) {
      console.error('이미지 삭제 중 오류:', error);
      // 삭제 실패해도 UI에서는 제거
      const newImages = images.filter((_, i) => i !== index);
      onImagesChange(newImages);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 mb-2 block">
          이미지 업로드
        </label>
        
        {/* 이미지 미리보기 */}
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={image}
                  alt={`레시피 이미지 ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border"
                  onError={(e) => {
                    console.error('이미지 로드 실패:', image);
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7snbTrr7jsp4DsnYw8L3RleHQ+Cjwvc3ZnPgo=';
                  }}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveImage(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* 업로드 버튼 */}
        {images.length < maxImages && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  이미지 선택 ({images.length}/{maxImages})
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 mt-2">
              {window.innerWidth < 768 ? 'JPG, PNG 파일만 가능 (최대 3MB, 자동 리사이징)' : 'JPG, PNG 파일만 가능 (최대 5MB, 자동 리사이징)'}
            </p>
            {isUploading && (
              <div className="mt-2 text-xs text-blue-600">
                모바일에서 이미지 처리 중... 잠시만 기다려주세요.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 