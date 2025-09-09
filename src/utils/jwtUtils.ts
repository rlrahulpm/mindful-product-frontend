export interface JwtPayload {
  sub: string;
  userId: number;
  exp: number;
  iat: number;
}

export const decodeJWT = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );

    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload) return true;
  
  const currentTime = Date.now() / 1000;
  return payload.exp < currentTime;
};

export const getTokenExpirationTime = (token: string): number | null => {
  const payload = decodeJWT(token);
  return payload ? payload.exp * 1000 : null;
};

export const shouldRefreshToken = (token: string, refreshThresholdMinutes: number = 30): boolean => {
  const expirationTime = getTokenExpirationTime(token);
  if (!expirationTime) return true;
  
  const now = Date.now();
  const timeUntilExpiration = expirationTime - now;
  const refreshThreshold = refreshThresholdMinutes * 60 * 1000; // Convert to milliseconds
  
  // Refresh when 30 minutes or less remain (was 5 minutes)
  return timeUntilExpiration <= refreshThreshold;
};