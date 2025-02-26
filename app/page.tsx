/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { registerServiceWorker } from "./sw-register";

interface Employee {
  id: number;
  name: string;
}

interface AttendanceRecord {
  id: number;
  employee: Employee;
  type: string;
  timestamp: string;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isPWAInstallable, setIsPWAInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    
    // PWA 설치 상태 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA가 이미 설치되어 있음');
      setIsInstalled(true);
    }

    // PWA 설치 가능 여부 확인 및 디버깅
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA 설치 가능!', e);
      e.preventDefault();
      setDeferredPrompt(e);
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
      console.log('Service Worker 지원됨');
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

  useEffect(() => {
    if (isLoggedIn) {
      fetchAttendanceRecords();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8000/login", {
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

  const fetchAttendanceRecords = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:8000/attendance-records", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAttendanceRecords(data);
      }
    } catch (error) {
      console.error("Error fetching records:", error);
    }
  };

  const handleDownloadPwa = async () => {
    console.log('설치 버튼 클릭됨');
    console.log('deferredPrompt 상태:', deferredPrompt);
    console.log('User Agent:', navigator.userAgent);
    console.log('Platform:', navigator.platform);
    
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

    // 개발 환경에서는 deferredPrompt가 없어도 진행
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if (!deferredPrompt && !isDevelopment) {
      if (!(/Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent))) {
        alert('Chrome 브라우저(안드로이드) 또는 Safari 브라우저(iOS)를 사용해주세요.');
        return;
      }
    }

    try {
      if (deferredPrompt) {
        // Show the install prompt
        const { outcome } = await deferredPrompt.prompt();
        
        if (outcome === 'accepted') {
          console.log('사용자가 PWA 설치를 수락했습니다.');
          setIsInstalled(true);
          setIsPWAInstallable(false);
        } else {
          console.log('사용자가 PWA 설치를 거절했습니다.');
        }
      } else if (isDevelopment) {
        // 개발 환경에서는 PWA 설치 가능 여부 디버깅 정보 표시
        alert('개발 환경 디버그 정보:\n' + 
              '- Service Worker 지원: ' + ('serviceWorker' in navigator) + '\n' +
              '- HTTPS 또는 localhost: ' + (window.location.protocol === 'https:' || window.location.hostname === 'localhost') + '\n' +
              '- Manifest 링크: ' + (!!document.querySelector('link[rel="manifest"]')) + '\n' +
              '- User Agent: ' + navigator.userAgent);
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

  const formatDate = (dateString: string) => {
    if (!isMounted) return dateString; // Return raw string during SSR
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    } catch (error) {
      return dateString;
    }
  };

  // Prevent hydration errors by not rendering until client-side
  if (!isMounted) {
    return null;
  }

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
              <h1 className="text-2xl font-bold">출퇴근 기록</h1>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      이름
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      구분
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.employee.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatDate(record.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {record.type === "check_in" ? "출근" : "퇴근"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
