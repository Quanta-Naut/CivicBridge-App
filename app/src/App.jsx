import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Homepage from "./components/Homepage";
import SplashScreen from "./components/SplashScreen";
import AuthFlow from "./components/AuthFlow";
import "./App.css";

function AppContent() {
  const [splashLoading, setSplashLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const { loading: authLoading, isAuthenticated, login } = useAuth();

  useEffect(() => {
    // Simulate loading for 3 seconds
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, 3000);

    // Prevent zoom functionality
    const preventZoom = (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventKeyboardZoom = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '0')) {
        e.preventDefault();
      }
    };

    const preventWheelZoom = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // Add event listeners
    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('keydown', preventKeyboardZoom);
    document.addEventListener('wheel', preventWheelZoom, { passive: false });

    return () => {
      clearTimeout(timer);
      // Clean up event listeners
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('keydown', preventKeyboardZoom);
      document.removeEventListener('wheel', preventWheelZoom);
    };
  }, []);

  const handleAuthSuccess = (user, token) => {
    login(user, token);
    setShowAuth(false);
  };

  const handleShowAuth = () => {
    setShowAuth(true);
  };

  const handleHideAuth = () => {
    setShowAuth(false);
  };

  if (splashLoading) {
    return <SplashScreen />;
  }

  if (authLoading) {
    return <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontSize: '18px'
    }}>
      Loading...
    </div>;
  }

  if (showAuth) {
    return (
      <AuthFlow 
        onAuthSuccess={handleAuthSuccess} 
        onBack={handleHideAuth}
      />
    );
  }

  return <Homepage onShowAuth={handleShowAuth} />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
