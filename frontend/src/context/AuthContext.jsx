import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { bindAuthHandlers } from '../api/axiosInstance';
import { loginUser, logoutUser, refreshUserSession, verifyMfaLogin } from '../api/authApi';
import { PORTAL_ROLE } from '../portalConfig';

export const AuthContext = createContext(null);

function parseToken(accessToken, fallbackUser = null) {
  if (!accessToken) return null;

  try {
    const decoded = jwtDecode(accessToken);
    return {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role?.toLowerCase(),
      exp: decoded.exp
    };
  } catch (error) {
    return fallbackUser
      ? {
          id: fallbackUser.id,
          email: fallbackUser.email,
          role: fallbackUser.role?.toLowerCase(),
          exp: undefined
        }
      : null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedToken = localStorage.getItem('smart_campus_access_token');
    return savedToken ? parseToken(savedToken) : null;
  });
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('smart_campus_access_token') || null);
  const [isLoading, setIsLoading] = useState(true);
  const tokenRef = useRef(accessToken);

  useEffect(() => {
    tokenRef.current = accessToken;
    if (accessToken) {
      localStorage.setItem('smart_campus_access_token', accessToken);
    } else {
      localStorage.removeItem('smart_campus_access_token');
    }
  }, [accessToken]);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem('smart_campus_access_token');
  }, []);

  const applySession = useCallback((nextToken, fallbackUser = null) => {
    const parsedUser = parseToken(nextToken, fallbackUser);

    if (parsedUser && parsedUser.role !== PORTAL_ROLE) {
      clearSession();
      return;
    }

    const normalizedToken = nextToken || null;
    tokenRef.current = normalizedToken;
    setAccessToken(normalizedToken);
    setUser(parsedUser);
    
    if (normalizedToken) {
      localStorage.setItem('smart_campus_access_token', normalizedToken);
    }
  }, [clearSession]);

  const refresh = useCallback(async () => {
    const data = await refreshUserSession();
    applySession(data.accessToken, data.user);
    return data.accessToken;
  }, [applySession]);

  const logout = useCallback(
    async ({ skipRequest = false } = {}) => {
      try {
        if (!skipRequest) {
          await logoutUser();
        }
      } finally {
        clearSession();
      }
    },
    [clearSession]
  );

  const login = useCallback(
    async (email, password) => {
      const data = await loginUser({ email, password }, PORTAL_ROLE);
      if (data.accessToken) {
        applySession(data.accessToken, data.user);
      }
      return data;
    },
    [applySession]
  );

  const register = useCallback(
    async (payload) => {
      const data = await registerUser(payload, PORTAL_ROLE);
      if (data.accessToken) {
        applySession(data.accessToken, data.user);
      }
      return data;
    },
    [applySession]
  );

  const verifyMfa = useCallback(
    async (mfaToken, code) => {
      const data = await verifyMfaLogin({ mfaToken, code }, PORTAL_ROLE);
      applySession(data.accessToken, data.user);
      return data;
    },
    [applySession]
  );

  useEffect(() => {
    bindAuthHandlers({
      tokenGetter: () => tokenRef.current,
      onRefresh: refresh,
      onLogout: logout
    });
  }, [logout, refresh]);

  useEffect(() => {
    let active = true;

    async function restore() {
      const savedToken = localStorage.getItem('smart_campus_access_token');
      
      if (!savedToken) {
        if (active) setIsLoading(false);
        return;
      }

      const parsed = parseToken(savedToken);

      if (parsed && parsed.exp && Date.now() < (parsed.exp * 1000 - 10000)) {
        if (active) {
          setIsLoading(false);
        }
        return;
      }

      try {
        await refresh();
      } catch (err) {
        clearSession();
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    restore();
    return () => {
      active = false;
    };
  }, [clearSession, refresh]);

  const value = useMemo(
    () => ({
      user,
      accessToken,
      login,
      register,
      verifyMfa,
      logout,
      isLoading
    }),
    [accessToken, isLoading, login, logout, register, user, verifyMfa]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
