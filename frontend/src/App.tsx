import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LibraryPage } from './pages/LibraryPage';
import { AuthorsPage } from './pages/AuthorsPage';
import { SeriesPage } from './pages/SeriesPage';
import { TagsPage } from './pages/TagsPage';
import { UploadPage } from './pages/UploadPage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const PrivateRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly }) => {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (adminOnly && !user?.isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
};

const AppContent = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Layout onSearch={setSearchQuery}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LibraryPage searchQuery={searchQuery} />} />
        <Route path="/authors" element={<AuthorsPage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/tags" element={<TagsPage />} />
        <Route 
          path="/upload" 
          element={
            <PrivateRoute adminOnly>
              <UploadPage />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <PrivateRoute adminOnly>
              <AdminDashboard />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

export default App;
