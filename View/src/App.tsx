import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import './App.css'
import MainLayout from './layouts/MainLayout';
import Login from './pages/login/Index';
import Register from './pages/register/Index';
import { isAuthenticated } from './api';
import type { JSX } from 'react';
import { ConfigProvider } from 'antd';
import routes from './config/routeConfig';
import { AuthProvider } from './api/AuthContext'; // 导入 AuthProvider
import AnonymousPage from './pages/anonymous/Index';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

const customTheme = {
  token: {
    colorPrimary: '#18181b',
    colorLink: '#444444',
    colorBgContainer: '#ffffff',
    borderRadius: 10,
    fontFamily: '"SF Pro Display", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxShadowTertiary: '0 4px 16px rgba(0,0,0,0.05)',
  },
  components: {
    Button: {
      colorPrimary: '#18181b',
      algorithm: true,
      fontWeight: 500,
    },
    Menu: {
      itemBg: 'transparent',
      colorActiveBarBorderSize: 0,
      itemHeight: 46,
      itemMarginInline: 12,
      iconSize: 17,
      fontSize: 15,
      itemSelectedColor: '#ffffff',
      itemSelectedBg: '#18181b',
      itemHoverColor: '#333333',
      itemBorderRadius: 8,
    },
  }
};

function App() {
  return (
    <AuthProvider>
      <ConfigProvider theme={customTheme}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/anonymous" element={<AnonymousPage />} />

            <Route path="/" element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }>
              {routes.map((route) => (
                <Route key={route.key} path={route.path} element={route.element} />
              ))}
            </Route>
          </Routes>
        </Router>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;