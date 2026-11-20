import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('gitflow_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate or fetch user details when token changes
  useEffect(() => {
    async function loadUser() {
      // Check if token exists in URL search params (after OAuth redirect)
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');

      let activeToken = token;

      if (urlToken) {
        localStorage.setItem('gitflow_token', urlToken);
        setToken(urlToken);
        activeToken = urlToken;
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      if (!activeToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${activeToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          console.warn('[Auth] Session expired or invalid token');
          localStorage.removeItem('gitflow_token');
          setToken(null);
          setUser(null);
        }
      } catch (err) {
        console.error('[Auth Error]:', err.message);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  // Initiate GitHub OAuth
  const loginWithGitHub = () => {
    window.location.href = '/api/auth/github';
  };

  // Direct Developer Login with GitHub username, name and anti-fraud email
  const loginDemo = async (username, customName = null, customEmail = null, customAvatar = null) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          name: customName, 
          email: customEmail,
          avatar_url: customAvatar 
        })
      });

      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem('gitflow_token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        throw new Error(data.error || 'Error al autenticar');
      }
    } catch (err) {
      console.error('[Developer Login Error]:', err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('gitflow_token');
    try {
      sessionStorage.clear();
    } catch (_) {}
    setToken(null);
    setUser(null);
    window.location.href = '/login?logged_out=true';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        loginWithGitHub,
        loginDemo,
        logout,
        isAuthenticated: Boolean(user && token)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
