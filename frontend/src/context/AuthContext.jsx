import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { bindAuthHandlers } from '../api/axiosInstance';
import { loginUser, logoutUser, refreshUserSession, registerUser, verifyMfaLogin } from '../api/authApi';
import { getUserSettings } from '../api/userApi';
import { PORTAL_ROLE } from '../portalConfig';

export const AuthContext = createContext(null);

function parseToken(accessToken, fallbackUser = null) {
  if (!accessToken) return null;

  try {
    const decoded = jwtDecode(accessToken);
    return {
      id: decoded.id,
      name: decoded.name || fallbackUser?.name || null,
      email: decoded.email,
      role: decoded.role?.toLowerCase(),
      isSuperAdmin: Boolean(decoded.isSuperAdmin ?? fallbackUser?.isSuperAdmin),
      canDeleteStudents: Boolean(decoded.canDeleteStudents ?? fallbackUser?.canDeleteStudents),
      department: fallbackUser?.department ?? null,
      batch: fallbackUser?.batch ?? null,
      year: fallbackUser?.year ?? null,
      employeeId: fallbackUser?.employeeId ?? null,
      joiningDate: fallbackUser?.joiningDate ?? null,
      exp: decoded.exp
    };
  } catch (error) {
    return fallbackUser
      ? {
          id: fallbackUser.id,
          name: fallbackUser.name || null,
          email: fallbackUser.email,
          role: fallbackUser.role?.toLowerCase(),
          isSuperAdmin: Boolean(fallbackUser.isSuperAdmin),
          canDeleteStudents: Boolean(fallbackUser.canDeleteStudents),
          department: fallbackUser.department ?? null,
          batch: fallbackUser.batch ?? null,
          year: fallbackUser.year ?? null,
          employeeId: fallbackUser.employeeId ?? null,
          joiningDate: fallbackUser.joiningDate ?? null,
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
        if (parsed.id) {
          getUserSettings()
            .then((data) => {
              if (active && data?.profile) {
                setUser((prev) => (prev ? {
                  ...prev,
                  name: data.profile.name || prev.name,
                  department: data.profile.department || prev.department,
                  batch: data.profile.batch || prev.batch,
                  year: data.profile.year || prev.year,
                  employeeId: data.profile.employeeId || prev.employeeId,
                  joiningDate: data.profile.joiningDate || prev.joiningDate,
                  isSuperAdmin: Boolean(data.profile.isSuperAdmin ?? prev.isSuperAdmin),
                  canDeleteStudents: Boolean(data.profile.canDeleteStudents ?? prev.canDeleteStudents),
                } : prev));
              }
            })
            .catch(() => {});
        }
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

  const updateUser = useCallback((partialUser) => {
    setUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        ...partialUser,
        role: partialUser.role ? partialUser.role.toLowerCase() : prev.role
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      updateUser,
      accessToken,
      login,
      register,
      verifyMfa,
      logout,
      isLoading
    }),
    [accessToken, isLoading, login, logout, register, updateUser, user, verifyMfa]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
