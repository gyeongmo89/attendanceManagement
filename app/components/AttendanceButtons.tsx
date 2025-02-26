/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { checkIsInOffice } from '../utils/locationUtils';

interface AttendanceButtonsProps {
  onCheckIn: () => Promise<void>;
  onCheckOut: () => Promise<void>;
}

export default function AttendanceButtons({ onCheckIn, onCheckOut }: AttendanceButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAttendance = async (type: 'in' | 'out') => {
    setIsLoading(true);
    setError("");

    try {
      const { isInOffice, error: locationError } = await checkIsInOffice();
      
      if (locationError) {
        setError(locationError);
        return;
      }

      if (!isInOffice) {
        setError("회사 위치에서만 출퇴근이 가능합니다.");
        return;
      }

      if (type === 'in') {
        await onCheckIn();
      } else {
        await onCheckOut();
      }
    } catch (err) {
      setError("처리 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-sm">
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleAttendance('in')}
          disabled={isLoading}
          className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          출근하기
        </button>
        <button
          onClick={() => handleAttendance('out')}
          disabled={isLoading}
          className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
        >
          퇴근하기
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-sm text-center">{error}</p>
      )}
    </div>
  );
}
