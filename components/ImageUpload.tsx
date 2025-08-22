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
  const [useOriginalFiles, setUseOriginalFiles] = useState(true);
  const [enableDownsizing, setEnableDownsizing] = useState(false);
  const [downsizeQuality, setDownsizeQuality] = useState(0.8);
  const [maxImageSize, setMaxImageSize] = useState(1200);
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
    
    // URL 문제 해결 시도
    if (imageUrl.includes('supabase.co')) {
      // 쿼리 파라미터 제거 시도
      const cleanUrl = imageUrl.split('?')[0];
      console.log('쿼리 파라미터 제거된 URL 시도:', cleanUrl);
      
      if (cleanUrl !== imageUrl) {
        event.currentTarget.src = cleanUrl;
        return;
      }
      
      // 수동 URL 생성 시도
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1].split('?')[0];
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const manualUrl = `${supabaseUrl}/storage/v1/object/public/recipe-images/recipes/${fileName}`;
      
      console.log('수동 생성된 URL 시도:', manualUrl);
      event.currentTarget.src = manualUrl;
      return;
    }
    
    // 모든 시도 실패 시 기본 이미지로 대체
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

  // 안전한 이미지 다운사이징
  const safeDownsizeImage = async (file: File): Promise<File> => {
    if (!enableDownsizing) {
      return file;
    }

    try {
      console.log('다운사이징 시작:', file.name, '크기:', file.size);
      
      // Canvas를 사용하여 다운사이징
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            const { width, height } = img;
            console.log('원본 이미지 크기:', width, 'x', height);
            
            // 최대 크기 제한
            let newWidth = width;
            let newHeight = height;
            
            if (width > height) {
              if (width > maxImageSize) {
                newHeight = Math.round((height * maxImageSize) / width);
                newWidth = maxImageSize;
              }
            } else {
              if (height > maxImageSize) {
                newWidth = Math.round((width * maxImageSize) / height);
                newHeight = maxImageSize;
              }
            }
            
            console.log('다운사이징 후 크기:', newWidth, 'x', newHeight);
            
            // 크기가 변경되지 않았다면 원본 반환
            if (newWidth === width && newHeight === height) {
              console.log('크기 변경 불필요, 원본 반환');
              resolve(file);
              return;
            }
            
            canvas.width = newWidth;
            canvas.height = newHeight;
            
            if (ctx) {
              // 이미지 품질 향상을 위한 설정
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              
              // 이미지 그리기
              ctx.drawImage(img, 0, 0, newWidth, newHeight);
              
              // 고품질로 변환
              canvas.toBlob((blob) => {
                if (blob) {
                  console.log('다운사이징 완료, Blob 크기:', blob.size);
                  
                  // Blob 크기가 너무 작으면 원본 사용
                  if (blob.size < 1000) {
                    console.warn('다운사이징된 Blob이 너무 작음, 원본 사용');
                    resolve(file);
                    return;
                  }
                  
                  const downsizeFile = new File([blob], file.name, {
                    type: file.type || 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  
                  console.log('다운사이징 성공:', downsizeFile.name, '크기:', downsizeFile.size);
                  console.log('크기 감소율:', ((1 - downsizeFile.size / file.size) * 100).toFixed(1) + '%');
                  
                  resolve(downsizeFile);
                } else {
                  console.warn('다운사이징 실패, 원본 사용');
                  resolve(file);
                }
              }, file.type || 'image/jpeg', downsizeQuality);
            } else {
              console.warn('Canvas 컨텍스트 없음, 원본 사용');
              resolve(file);
            }
          } catch (error) {
            console.warn('다운사이징 중 오류, 원본 사용:', error);
            resolve(file);
          }
        };
        
        img.onerror = () => {
          console.warn('이미지 로드 실패, 원본 사용');
          resolve(file);
        };
        
        // 메모리 누수 방지
        img.crossOrigin = 'anonymous';
        img.src = URL.createObjectURL(file);
      });
      
    } catch (error) {
      console.warn('다운사이징 실패, 원본 사용:', error);
      return file;
    }
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

          // 2단계: 원본 파일 사용 (변환 없음)
          let processedFile = file;
          console.log('원본 파일 사용, 변환 건너뛰기:', file.name, '타입:', file.type);

          // 3단계: 파일 크기 검증
          const maxFileSize = isMobile ? 3 * 1024 * 1024 : 5 * 1024 * 1024;
          if (processedFile.size > maxFileSize) {
            console.warn('파일 크기 초과:', processedFile.size, '>', maxFileSize);
            alert(`파일 크기는 ${isMobile ? '3MB' : '5MB'} 이하여야 합니다.\n\n현재 파일: ${(processedFile.size / 1024 / 1024).toFixed(2)}MB`);
            continue;
          }

          // 4단계: 다운사이징 (옵션에 따라)
          let processedFileForUpload = processedFile;
          
          if (enableDownsizing) {
            console.log('다운사이징 적용:', processedFile.name);
            try {
              processedFileForUpload = await safeDownsizeImage(processedFile);
              console.log('다운사이징 완료:', processedFileForUpload.name, '크기:', processedFileForUpload.size);
            } catch (downsizeError) {
              console.warn('다운사이징 실패, 원본 사용:', downsizeError);
              processedFileForUpload = processedFile;
            }
          } else {
            console.log('다운사이징 비활성화, 원본 파일 사용');
          }

          // 5단계: Supabase Storage 업로드
          const timestamp = Date.now();
          // 파일명을 더 깔끔하게 생성 (확장자 유지)
          const fileExtension = file.name.split('.').pop() || 'jpg';
          const cleanFileName = `${timestamp}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
          const filePath = `recipes/${cleanFileName}`;
          
          // 최종 파일의 MIME 타입 재검증 및 강제 설정
          if (!processedFileForUpload.type.startsWith('image/')) {
            console.error('잘못된 MIME 타입:', processedFileForUpload.type);
            alert(`파일 형식이 잘못되었습니다: ${processedFileForUpload.type}\n\n원본 파일 사용 옵션을 활성화하고 다시 시도해보세요.`);
            continue;
          }
          
          // MIME 타입을 확장자에 따라 강제 설정
          let finalFile = processedFileForUpload;
          if (fileExtension.toLowerCase() === 'jpg' || fileExtension.toLowerCase() === 'jpeg') {
            finalFile = new File([processedFileForUpload], processedFileForUpload.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            console.log('MIME 타입을 image/jpeg로 강제 설정');
          } else if (fileExtension.toLowerCase() === 'png') {
            finalFile = new File([processedFileForUpload], processedFileForUpload.name, {
              type: 'image/png',
              lastModified: Date.now()
            });
            console.log('MIME 타입을 image/png로 강제 설정');
          } else if (fileExtension.toLowerCase() === 'webp') {
            finalFile = new File([processedFileForUpload], processedFileForUpload.name, {
              type: 'image/webp',
              lastModified: Date.now()
            });
            console.log('MIME 타입을 image/webp로 강제 설정');
          }
          
          console.log('Storage 업로드 시작:', filePath);
          console.log('업로드할 파일 정보:', {
            name: finalFile.name,
            type: finalFile.type,
            size: finalFile.size,
            lastModified: finalFile.lastModified
          });
          
          // 6단계: Supabase Storage 업로드
          console.log('Storage 업로드 시작:', filePath);
          
          // 업로드 시도
          try {
            await storageApi.uploadImage(finalFile, filePath);
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
      if (imageUrl.includes('supabase.co')) {
        // URL에서 파일 경로 추출
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1].split('?')[0]; // 쿼리 파라미터 제거
        const filePath = `recipes/${fileName}`;
        
        console.log('Storage에서 파일 삭제:', filePath);
        await storageApi.deleteImage(filePath);
        console.log('Storage 파일 삭제 완료');
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
            
            {/* 원본 파일 사용 안내 */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm text-blue-800 font-medium mb-1">
                📱 이미지 업로드 최적화
              </div>
              <div className="text-xs text-blue-700">
                이미지 변환이나 리사이징 없이 원본 파일을 그대로 업로드하여 품질을 보장합니다.
              </div>
            </div>
            
            {/* 다운사이징 옵션 */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  checked={enableDownsizing}
                  onChange={(e) => setEnableDownsizing(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-green-800 font-medium">
                  🖼️ 이미지 다운사이징 (선택사항)
                </span>
              </div>
              
              {enableDownsizing && (
                <div className="space-y-2 ml-6">
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-green-700">최대 크기:</label>
                    <select
                      value={maxImageSize}
                      onChange={(e) => setMaxImageSize(Number(e.target.value))}
                      className="text-xs border border-green-200 rounded px-2 py-1"
                    >
                      <option value={800}>800px</option>
                      <option value={1200}>1200px</option>
                      <option value={1600}>1600px</option>
                      <option value={2000}>2000px</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <label className="text-xs text-green-700">품질:</label>
                    <select
                      value={downsizeQuality}
                      onChange={(e) => setDownsizeQuality(Number(e.target.value))}
                      className="text-xs border border-green-200 rounded px-2 py-1"
                    >
                      <option value={0.6}>낮음 (60%)</option>
                      <option value={0.8}>보통 (80%)</option>
                      <option value={0.9}>높음 (90%)</option>
                      <option value={0.95}>최고 (95%)</option>
                    </select>
                  </div>
                  
                  <div className="text-xs text-green-600">
                    💡 다운사이징을 활성화하면 이미지 크기와 품질을 조절하여 파일 크기를 줄일 수 있습니다.
                  </div>
                </div>
              )}
            </div>
            
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