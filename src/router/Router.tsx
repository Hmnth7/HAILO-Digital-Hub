import React, { createContext, useContext, useState, useEffect } from 'react';

interface RouterContextType {
  currentPath: string;
  navigate: (to: string) => void;
  params: Record<string, string>;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export const useRouter = () => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within a CustomRouter');
  }
  return context;
};

function getInitialPath(): string {
  if (typeof window === 'undefined') return '/admin/dashboard';
  
  if (window.location.hash.startsWith('#/')) {
    return window.location.hash.slice(1);
  }
  
  const pathname = window.location.pathname;
  if (!pathname || pathname === '/' || pathname === '/index.html') {
    return '/login';
  }
  return pathname;
}

export const CustomRouter: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(getInitialPath());
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (to: string) => {
    const cleanTo = to.startsWith('/') ? to : `/${to}`;
    window.history.pushState({}, '', cleanTo);
    setCurrentPath(cleanTo);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const params: Record<string, string> = {};
  
  // Match /report/success/:complaintId
  const successMatch = currentPath.match(/^\/report\/success(?:\/([A-Za-z0-9_-]+))?$/i);
  if (successMatch) {
    if (successMatch[1]) {
      params.complaintId = successMatch[1];
    }
  } else {
    // Match /report/:binCode
    const reportMatch = currentPath.match(/^\/report\/([A-Za-z0-9_-]+)$/i);
    if (reportMatch && reportMatch[1].toLowerCase() !== 'success') {
      params.binCode = reportMatch[1].toUpperCase();
    }
  }

  // Match /admin/bins/:binCode or /bins/:binCode
  const binDetailMatch = currentPath.match(/^\/(?:admin\/)?bins\/([A-Za-z0-9_-]+)$/i);
  if (binDetailMatch) {
    params.binCode = binDetailMatch[1].toUpperCase();
  }

  return (
    <RouterContext.Provider value={{ currentPath, navigate, params }}>
      {children}
    </RouterContext.Provider>
  );
};
