import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useState } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Home from './pages/Home';
import Navbar from './components/Navbar';
import Signup from './components/Signup';
import './index.css';
import './App.css';
import { FirebaseProvider } from './context/FirebaseContext';
import AttendanceReport from './components/AttendanceReport';
import FaceRegistration from './components/FaceRegistration';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Admin from './components/Admin';
import { Toaster } from 'react-hot-toast';
import Attendance from './components/Attendance';
import CompreFaceTest from './components/CompreFaceTest';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  return (
    <>
      <Toaster />
      <div className='w-screen overflow-y min-h-[100vh] bg-richblack-900 flex flex-col'>
        <div>
          <FirebaseProvider>
            <AuthProvider>
              <Router>
                <Navbar>
                </Navbar>
                <Routes>
                  {/* <Route path="/" element={<Home />} /> */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/admin" element={
                    <AdminRoute>
                      <Admin />
                    </AdminRoute>
                  } />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/register-face" element={
                    <PrivateRoute>
                      <FaceRegistration />
                    </PrivateRoute>
                  } />
                  <Route path="/dashboard" element={
                    <PrivateRoute>
                      <Dashboard />
                    </PrivateRoute>
                  } />
                  <Route path="/attendance-report" element={
                    <PrivateRoute>
                      <AttendanceReport />
                    </PrivateRoute>
                  } />
                  <Route path="/mark-attendance" element={
                    <ProtectedRoute>
                      <Attendance />
                    </ProtectedRoute>
                  } />
                  <Route path="/compreface-test" element={
                    <PrivateRoute>
                      <CompreFaceTest />
                    </PrivateRoute>
                  } />
                  <Route path="/" element={<Navigate to="/login" replace />} />
                </Routes>
              </Router>
            </AuthProvider>
          </FirebaseProvider>
        </div>
      </div>
    </>
  );
}

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default App;
