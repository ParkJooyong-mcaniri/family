'use client'

import { useEffect, useState } from 'react'
import { storageApi } from '@/lib/supabase-client'

export default function TestStorage() {
  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testStorage = async () => {
    setLoading(true)
    try {
      // 간단한 테스트 파일 생성
      const testContent = 'Hello Supabase Storage!'
      const testFile = new File([testContent], 'test.txt', { type: 'text/plain' })
      
      const testPath = `test/${Date.now()}_test.txt`
      
      console.log('Storage 테스트 시작:', testPath)
      
      // 업로드 테스트
      await storageApi.uploadImage(testFile, testPath)
      console.log('업로드 성공')
      
      // URL 테스트
      const publicUrl = storageApi.getPublicUrl(testPath)
      console.log('공개 URL:', publicUrl)
      
      // 삭제 테스트
      await storageApi.deleteImage(testPath)
      console.log('삭제 성공')
      
      setTestResult(`✅ Storage 연결 성공!

테스트 결과:
- 업로드: 성공
- 공개 URL 생성: 성공  
- 삭제: 성공

Storage 버킷이 정상적으로 설정되어 있습니다.`)
    } catch (error) {
      console.error('Storage 테스트 실패:', error)
      setTestResult(`❌ Storage 연결 실패: ${error instanceof Error ? error.message : String(error)}

가능한 원인:
1. Storage 버킷이 생성되지 않음
2. Storage 정책이 설정되지 않음
3. 권한 문제

해결 방법:
1. Supabase Dashboard에서 Storage 버킷 'recipe-images' 생성
2. Storage 정책 설정
3. 환경변수 확인`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Storage 연결 테스트</h1>
      
      <button 
        onClick={testStorage}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-4"
      >
        {loading ? '테스트 중...' : 'Storage 테스트'}
      </button>

      {testResult && (
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-bold mb-2">테스트 결과:</h2>
          <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
        </div>
      )}
    </div>
  )
} 