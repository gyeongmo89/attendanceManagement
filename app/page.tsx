/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import { API_BASE_URL } from './config/api';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// interface AttendanceRecord {
//   id: number;
//   type: 'check-in' | 'check-out';
//   timestamp: string;
// }

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPWAInstallable, setIsPWAInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // PWA 설치 상태 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA가 이미 설치되어 있음');
      setIsInstalled(true);
    }

    // PWA 설치 가능 여부 확인 및 디버깅
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA 설치 가능!', e);
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsPWAInstallable(true);
    });

    // PWA 설치 완료 이벤트 처리
    window.addEventListener('appinstalled', (e) => {
      console.log('PWA가 성공적으로 설치됨!');
      setIsInstalled(true);
      setIsPWAInstallable(false);
      setDeferredPrompt(null);
    });

    // Service Worker 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          console.log('Service Worker 등록 성공:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker 등록 실패:', error);
        });
    }

    // Check if user is already logged in
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username=${encodeURIComponent(
          username
        )}&password=${encodeURIComponent(password)}`,
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("token", data.access_token);
        setIsLoggedIn(true);
      } else {
        alert("로그인 실패");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  const handleDownloadPwa = async () => {
    console.log('설치 버튼 클릭됨');
    console.log('deferredPrompt 상태:', deferredPrompt);
    
    // 이미 설치된 경우
    if (isInstalled) {
      alert('앱이 이미 설치되어 있습니다. 설치된 앱을 실행해주세요.');
      return;
    }

    // iOS 디바이스 처리
    if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      alert('iOS에서는 Safari 브라우저의 "홈 화면에 추가" 버튼을 눌러 설치하세요.\n\n1. Safari 브라우저 하단의 "공유" 버튼을 탭하세요.\n2. "홈 화면에 추가" 옵션을 선택하세요.\n3. "추가" 버튼을 탭하세요.');
      return;
    }

    try {
      if (deferredPrompt) {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        
        if (choiceResult.outcome === 'accepted') {
          console.log('사용자가 PWA 설치를 수락했습니다.');
          setIsInstalled(true);
          setIsPWAInstallable(false);
        } else {
          console.log('사용자가 PWA 설치를 거절했습니다.');
        }
      } else {
        alert('앱 설치가 지원되지 않는 환경입니다. Chrome(안드로이드) 또는 Safari(iOS)를 사용해주세요.');
      }
    } catch (error) {
      console.error('PWA 설치 중 오류 발생:', error);
      alert('앱 설치 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-purple-600">
      {!isLoggedIn ? (
        <div className="flex min-h-screen items-center justify-center relative">
          <button
            onClick={handleDownloadPwa}
            className="absolute top-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-md hover:from-purple-600 hover:to-pink-600 z-10"
          >
            출퇴근 앱 다운로드
          </button>
          <div className="bg-white p-8 rounded-lg shadow-md w-96">
            <div className="flex justify-center mb-4">
              <div className="rounded-full overflow-hidden border-2 border-purple-500 p-1">
                <div 
                  className="w-16 h-16 bg-purple-200 flex items-center justify-center text-purple-700 font-bold text-xl"
                >
                  M
                </div>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-6 text-center">
              Mediv 근태관리 시스템
            </h1>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="아이디"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1 block w-full text-stone-900 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-2"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="비밀번호"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full text-stone-900 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 p-2"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white p-2 rounded-md hover:from-purple-600 hover:to-pink-600"
              >
                로그인
              </button>
            </form>
            <div className="mt-6 text-center text-sm text-gray-600">
              <p>The copyright of this system belongs to Kimgyeongmo.</p>
              <p>Version 1.0.0</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold">출퇴근 관리</h1>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (!token) return;

                  fetch(`${API_BASE_URL}/attendance/check-in`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error('Check-in failed');
                    }
                    alert('출근 처리되었습니다.');
                  })
                  .catch(error => {
                    console.error('Check-in error:', error);
                    alert('출근 처리 중 오류가 발생했습니다.');
                  });
                }}
                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                출근하기
              </button>
              <button
                onClick={() => {
                  const token = localStorage.getItem('token');
                  if (!token) return;

                  fetch(`${API_BASE_URL}/attendance/check-out`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                    },
                  })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error('Check-out failed');
                    }
                    alert('퇴근 처리되었습니다.');
                  })
                  .catch(error => {
                    console.error('Check-out error:', error);
                    alert('퇴근 처리 중 오류가 발생했습니다.');
                  });
                }}
                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                퇴근하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
