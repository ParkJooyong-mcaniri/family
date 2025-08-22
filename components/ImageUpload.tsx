"use client";

import { useState, useRef, useEffect } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [imageLoadingStates, setImageLoadingStates] = useState<{ [key: string]: boolean }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 모바일 감지 (SSR 안전)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 이미지 로딩 상태 관리
  const handleImageLoad = (imageUrl: string) => {
    setImageLoadingStates(prev => ({ ...prev, [imageUrl]: false }));
    console.log('이미지 로드 성공:', imageUrl);
  };

  const handleImageError = (imageUrl: string, event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageLoadingStates(prev => ({ ...prev, [imageUrl]: false }));
    console.error('이미지 로드 실패:', imageUrl);
    
    // 에러 발생 시 이미지 URL을 다시 확인
    console.log('실패한 이미지 URL 정보:', {
      url: imageUrl,
      urlType: typeof imageUrl,
      urlLength: imageUrl?.length,
      startsWithHttp: imageUrl?.startsWith('http'),
      containsSupabase: imageUrl?.includes('supabase')
    });
    
    // 기본 이미지로 대체
    event.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Q0EzQUYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7snbTrr7jsp4DsnYw8L3RleHQ+Cjwvc3ZnPgo=';
  };

  const handleImageLoadStart = (imageUrl: string) => {
    setImageLoadingStates(prev => ({ ...prev, [imageUrl]: true }));
    console.log('이미지 로드 시작:', imageUrl);
  };

  // 아이폰에서 지원하는 이미지 형식 확인
  const isSupportedImageFormat = (file: File): boolean => {
    const supportedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/heic',
      'image/heif',
      'image/webp'
    ];
    
    // MIME 타입 체크
    if (supportedTypes.includes(file.type)) {
      return true;
    }
    
    // 파일 확장자 체크 (아이폰에서 MIME 타입이 제대로 감지되지 않는 경우)
    const fileName = file.name.toLowerCase();
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp'];
    
    return supportedExtensions.some(ext => fileName.endsWith(ext));
  };

  // HEIC/HEIF를 JPEG로 변환 (아이폰 호환성)
  const convertHeicToJpeg = async (file: File): Promise<File> => {
    if (file.type === 'image/heic' || file.type === 'image/heif' || 
        file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      
      try {
        // Canvas를 사용하여 JPEG로 변환
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              canvas.width = img.width;
              canvas.height = img.height;
              
              if (ctx) {
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                  if (blob) {
                    const jpegFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    });
                    resolve(jpegFile);
                  } else {
                    reject(new Error('HEIC 변환에 실패했습니다.'));
                  }
                }, 'image/jpeg', 0.8);
              } else {
                reject(new Error('Canvas 컨텍스트를 가져올 수 없습니다.'));
              }
            } catch (error) {
              reject(error);
            }
          };
          
          img.onerror = () => reject(new Error('HEIC 이미지 로드에 실패했습니다.'));
          img.src = URL.createObjectURL(file);
        });
      } catch (error) {
        console.warn('HEIC 변환 실패, 원본 파일 사용:', error);
        return file; // 변환 실패 시 원본 파일 반환
      }
    }
    
    return file; // HEIC가 아닌 경우 원본 반환
  };

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

    console.log('파일 선택됨:', files.length, '개');
    console.log('파일 정보:', Array.from(files).map(f => ({ name: f.name, type: f.type, size: f.size })));

    if (images.length + files.length > maxImages) {
      alert(`최대 ${maxImages}개의 이미지만 업로드할 수 있습니다.`);
      return;
    }

    setIsUploading(true);

    try {
      const newImageUrls: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`파일 ${i + 1} 처리 시작:`, file.name, file.type, file.size);
        
        try {
          // 1단계: 파일 타입 검증
          if (!isSupportedImageFormat(file)) {
            console.warn('지원되지 않는 파일 형식:', file.name, file.type);
            alert(`지원되지 않는 파일 형식입니다: ${file.name}\n\n지원 형식: JPG, PNG, HEIC, WebP`);
            continue;
          }

          // 2단계: HEIC 변환 (필요한 경우)
          let processedFile = file;
          if (file.type === 'image/heic' || file.type === 'image/heif' || 
              file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
            console.log('HEIC 변환 시작:', file.name);
            try {
              processedFile = await convertHeicToJpeg(file);
              console.log('HEIC 변환 완료:', processedFile.name, '크기:', processedFile.size);
            } catch (heicError) {
              console.warn('HEIC 변환 실패, 원본 파일 사용:', heicError);
              processedFile = file; // 변환 실패 시 원본 사용
            }
          }

          // 3단계: 파일 크기 검증
          const maxFileSize = isMobile ? 3 * 1024 * 1024 : 5 * 1024 * 1024;
          if (processedFile.size > maxFileSize) {
            console.warn('파일 크기 초과:', processedFile.size, '>', maxFileSize);
            alert(`파일 크기는 ${isMobile ? '3MB' : '5MB'} 이하여야 합니다.\n\n현재 파일: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
            continue;
          }

          // 4단계: 이미지 리사이징
          console.log('이미지 리사이징 시작:', processedFile.name);
          let resizedFile = processedFile;
          
          try {
            resizedFile = await resizeImage(processedFile);
            console.log('이미지 리사이징 완료:', resizedFile.name, '크기:', resizedFile.size);
          } catch (resizeError) {
            console.warn('리사이징 실패, 원본 파일 사용:', resizeError);
            resizedFile = processedFile; // 리사이징 실패 시 원본 사용
          }

          // 5단계: Supabase Storage 업로드
          const timestamp = Date.now();
          const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const filePath = `recipes/${fileName}`;
          
          console.log('Storage 업로드 시작:', filePath);
          console.log('업로드할 파일 정보:', {
            name: resizedFile.name,
            type: resizedFile.type,
            size: resizedFile.size,
            lastModified: resizedFile.lastModified
          });
          
          // 업로드 시도
          try {
            await storageApi.uploadImage(resizedFile, filePath);
            console.log('Storage 업로드 완료');
          } catch (uploadApiError) {
            console.error('Storage API 업로드 실패:', uploadApiError);
            throw new Error(`Storage 업로드 실패: ${uploadApiError instanceof Error ? uploadApiError.message : '알 수 없는 오류'}`);
          }
          
          // 6단계: 공개 URL 가져오기
          console.log('공개 URL 생성 시작');
          let publicUrl = storageApi.getPublicUrl(filePath);
          console.log('생성된 공개 URL:', publicUrl);
          
          // URL 유효성 검증 및 수정
          if (!publicUrl || publicUrl === '') {
            console.error('공개 URL이 비어있음');
            throw new Error('공개 URL을 가져올 수 없습니다.');
          }
          
          // Supabase URL 형식 검증 및 수정
          if (publicUrl.includes('supabase.co')) {
            // Supabase URL이 올바른 형식인지 확인
            if (!publicUrl.startsWith('https://')) {
              publicUrl = publicUrl.replace('http://', 'https://');
              console.log('URL을 HTTPS로 수정:', publicUrl);
            }
            
            // URL 끝에 쿼리 파라미터가 있는지 확인
            if (!publicUrl.includes('?') && !publicUrl.includes('&')) {
              // Supabase Storage 공개 URL에 필요한 쿼리 파라미터 추가
              publicUrl = `${publicUrl}?v=${Date.now()}`;
              console.log('캐시 방지 파라미터 추가:', publicUrl);
            }
          }
          
          if (!publicUrl.startsWith('http')) {
            console.error('잘못된 URL 형식:', publicUrl);
            throw new Error('잘못된 URL 형식입니다.');
          }
          
          console.log('최종 검증된 URL:', publicUrl);
          
          newImageUrls.push(publicUrl);
          console.log(`파일 ${i + 1} 처리 완료:`, file.name);
          console.log('현재까지 성공한 이미지 수:', newImageUrls.length);
          
        } catch (uploadError) {
          console.error('개별 파일 업로드 실패:', file.name, uploadError);
          
          // 구체적인 에러 메시지
          let errorMessage = '알 수 없는 오류';
          if (uploadError instanceof Error) {
            if (uploadError.message.includes('Storage')) {
              errorMessage = '이미지 저장소 업로드에 실패했습니다. 네트워크 연결을 확인해주세요.';
            } else if (uploadError.message.includes('공개 URL')) {
              errorMessage = '이미지 URL 생성에 실패했습니다.';
            } else if (uploadError.message.includes('리사이징')) {
              errorMessage = '이미지 처리 중 오류가 발생했습니다.';
            } else {
              errorMessage = uploadError.message;
            }
          }
          
          alert(`파일 "${file.name}" 업로드에 실패했습니다:\n\n${errorMessage}\n\n다른 이미지를 시도해보세요.`);
          continue;
        }
      }

      // 7단계: 최종 결과 처리
      if (newImageUrls.length > 0) {
        console.log('새 이미지 URL들:', newImageUrls);
        onImagesChange([...images, ...newImageUrls]);
        console.log('이미지 업로드 완료:', newImageUrls.length, '개');
        
        // 성공 메시지
        alert(`✅ 이미지 업로드 완료!\n\n${newImageUrls.length}개 파일이 성공적으로 업로드되었습니다.`);
      } else {
        console.log('업로드된 이미지가 없음');
        alert('⚠️ 업로드할 수 있는 이미지가 없습니다.\n\n지원 형식: JPG, PNG, HEIC, WebP\n파일 크기: 3MB 이하');
      }
      
    } catch (error) {
      console.error('전체 업로드 과정 중 오류:', error);
      alert(`이미지 업로드 중 오류가 발생했습니다:\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}\n\n페이지를 새로고침하고 다시 시도해보세요.`);
    } finally {
      setIsUploading(false);
      // 모든 입력 필드 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      const cameraInput = document.getElementById('camera-input') as HTMLInputElement;
      if (cameraInput) {
        cameraInput.value = '';
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
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              업로드된 이미지: {images.length}개
            </div>
            
            {/* 디버깅 정보 (개발 모드에서만 표시) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-gray-100 p-3 rounded text-xs text-gray-700 space-y-1">
                <div>디버깅 정보:</div>
                {images.map((image, index) => (
                  <div key={`debug-${index}`} className="text-xs">
                    이미지 {index + 1}: {image?.substring(0, 100)}...
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  {/* 로딩 상태 표시 */}
                  {imageLoadingStates[image] && (
                    <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  
                  <img
                    src={image}
                    alt={`레시피 이미지 ${index + 1}`}
                    className={`w-full h-32 object-cover rounded-lg border ${
                      imageLoadingStates[image] ? 'opacity-0' : 'opacity-100'
                    } transition-opacity duration-300`}
                    onLoad={() => handleImageLoad(image)}
                    onError={(e) => handleImageError(image, e)}
                    onLoadStart={() => handleImageLoadStart(image)}
                  />
                  
                  {/* 이미지 정보 툴팁 */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="truncate">{image?.substring(0, 50)}...</div>
                  </div>
                  
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
          </div>
        )}

        {/* 업로드 버튼 */}
        {images.length < maxImages && (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* 아이폰에서 사진 선택과 카메라 모두 사용할 수 있도록 버튼 분리 */}
            {isMobile ? (
              <div className="space-y-2">
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
                      사진 선택 ({images.length}/{maxImages})
                    </>
                  )}
                </Button>
                
                {/* 카메라 전용 버튼 */}
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,image/webp"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="camera-input"
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('camera-input')?.click()}
                  disabled={isUploading}
                  className="w-full"
                >
                  📷 카메라로 촬영
                </Button>
              </div>
            ) : (
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
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              {isMobile ? 'JPG, PNG, HEIC 파일 지원 (최대 3MB, 자동 변환 및 리사이징)' : 'JPG, PNG, HEIC 파일 지원 (최대 5MB, 자동 변환 및 리사이징)'}
            </p>
            {isMobile && (
              <p className="text-xs text-blue-600 mt-1">
                📱 아이폰: 사진 선택 또는 카메라로 촬영 가능, HEIC 파일도 자동으로 JPEG로 변환됩니다
              </p>
            )}
            {isUploading && (
              <div className="mt-2 text-xs text-blue-600">
                {isMobile ? '모바일에서 이미지 처리 중... 잠시만 기다려주세요.' : '이미지 처리 중... 잠시만 기다려주세요.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 