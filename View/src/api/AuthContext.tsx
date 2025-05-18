import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { getCurrentUser, isAuthenticated, clearAuthData, getStoredUser } from './index';
import type { UserProfile } from './types';
import { UserRole } from './types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  authenticated: boolean;
  authError: string | null;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (requiredRole: UserRole) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authenticated: false,
  authError: null,
  logout: () => {},
  refreshUser: async () => {},
  hasRole: () => false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const refreshUser = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    
    try {
      const isLoggedIn = isAuthenticated();
      
      if (isLoggedIn) {
        const storedUser = getStoredUser();
        if (storedUser) {
          setUser(storedUser);
        }
        
        const response = await getCurrentUser();
        
        if (response.success && response.data) {
          setUser(response.data);
        } else if (!storedUser) {
          setAuthError(response.message || '获取用户信息失败');
          clearAuthData();
          setUser(null);
        }
      } else {
        clearAuthData();
        setUser(null);
      }
    } catch (error: any) {
      setAuthError(error.message || '获取用户信息时发生错误');
      if (!getStoredUser()) {
        clearAuthData();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  
  const logout = useCallback(() => {
    clearAuthData();
    setUser(null);
  }, []);
  
  const hasRole = useCallback((requiredRole: UserRole): boolean => {
    if (!user?.roleName) return false;
    
    // 管理员拥有所有权限
    if (user.roleName === UserRole.Administrator) {
      return true;
    }
    
    // 特定角色检查
    return user.roleName === requiredRole;
  }, [user]);
  
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);
  
  const contextValue = {
    user,
    loading,
    authenticated: !!user,
    authError,
    logout,
    refreshUser,
    hasRole
  };
  
  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
