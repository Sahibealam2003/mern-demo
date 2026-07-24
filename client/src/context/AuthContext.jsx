import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axiosInstance from "../api/axiosInstance";

const AuthContext = createContext(null);

/**
 * AuthProvider - Global authentication state management
 * Provides: user, isAuthenticated, loading, login, logout, refreshUser
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.get("/auth/me");
        if (response.data.success) {
          setUser(response.data.data.user);
          setIsAuthenticated(true);
        }
      } catch {
        // Token invalid or expired - clear storage
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  /**
   * Login user and store tokens
   */
  const login = useCallback(async (credentials) => {
    const response = await axiosInstance.post("/auth/login", credentials);
    
    if (response.data.success) {
      const { accessToken, refreshToken, user: userData } = response.data.data;
      
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      
      setUser(userData);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    }
    
    throw new Error(response.data.message || "Login failed");
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(async (userData) => {
    const response = await axiosInstance.post("/auth/register", userData);
    
    if (response.data.success) {
      const { accessToken, refreshToken, user: newUser } = response.data.data;
      
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      
      setUser(newUser);
      setIsAuthenticated(true);
      
      return { success: true, user: newUser };
    }
    
    throw new Error(response.data.message || "Registration failed");
  }, []);

  /**
   * Logout user and clear tokens
   */
  const logout = useCallback(async () => {
    try {
      await axiosInstance.post("/auth/logout");
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("Logout API error:", error);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await axiosInstance.get("/auth/me");
      if (response.data.success) {
        setUser(response.data.data.user);
        return response.data.data.user;
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
    }
    return null;
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;