import React from 'react'
import { Navigate } from 'react-router-dom';
import { useFirebase } from '../context/FirebaseContext';

function PrivateRoute({ children }) {
  const { user, loading } = useFirebase();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default PrivateRoute
