/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useEffect, useState } from 'react';
import LoginForm from './components/LoginForm';
import AttendanceButtons from './components/AttendanceButtons';

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

    // 로그인 상태 확인
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', () => {});
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  const handleLogin = async (username: string, password: string) => {
    try {
      const response = await fetch('http://localhost:8000/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      setIsLoggedIn(true);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const handleCheckIn = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/attendance/check-in', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Check-in failed');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      throw error;
    }
  };

  const handleCheckOut = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:8000/attendance/check-out', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Check-out failed');
      }
    } catch (error) {
      console.error('Check-out error:', error);
      throw error;
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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 space-y-8">
      <h1 className="text-2xl font-bold text-center">Mediv 근태관리 시스템</h1>
      
      {!isLoggedIn ? (
        <LoginForm onLogin={handleLogin} />
      ) : (
        <AttendanceButtons 
          onCheckIn={handleCheckIn}
          onCheckOut={handleCheckOut}
        />
      )}

      {!isInstalled && isPWAInstallable && (
        <button
          onClick={handleDownloadPwa}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          출퇴근 앱 다운로드
        </button>
      )}
    </main>
  );
}
