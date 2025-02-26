/* eslint-disable @typescript-eslint/no-unused-vars */
const OFFICE_LOCATION = {
  latitude: 36.636736,
  longitude: 127.323375,
  radius: 100 // 미터 단위의 반경
};

export const checkIsInOffice = async (): Promise<{ isInOffice: boolean; error?: string }> => {
  try {
    const position = await getCurrentPosition();
    const distance = calculateDistance(
      position.coords.latitude,
      position.coords.longitude,
      OFFICE_LOCATION.latitude,
      OFFICE_LOCATION.longitude
    );
    
    return {
      isInOffice: distance <= OFFICE_LOCATION.radius
    };
  } catch (error) {
    return {
      isInOffice: false,
      error: '위치 정보를 가져올 수 없습니다.'
    };
  }
};

const getCurrentPosition = (): Promise<GeolocationPosition> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    });
  });
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // 지구의 반지름 (미터)
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // 미터 단위 거리
};
