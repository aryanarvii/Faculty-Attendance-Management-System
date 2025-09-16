import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserData, updateUserData } from '../firebase/userService';
import { getTodayAttendance } from '../firebase/attendanceService';
import { format } from 'date-fns';
import FaceVerification from './FaceVerification';
import LeaveApplication from './LeaveApplication';
import logo from '../assets/ManipalLogo.png';

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [verificationMode, setVerificationMode] = useState('');
  const [error, setError] = useState('');
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userDetails, attendance] = await Promise.all([
          getUserData(user.uid),
          getTodayAttendance(user.uid)
        ]);
        setUserData(userDetails);
        setTodayAttendance(attendance);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchData();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleAttendanceAction = async (action) => {
    try {
      // Verify location
      const location = await getCurrentLocation();
      const wifiSSID = await getCurrentWifiSSID();
      
      const onCampus = isOnCampus(location.latitude, location.longitude);
      const onCampusWifi = isOnCampusWifi(wifiSSID);
      
      if (!onCampus || !onCampusWifi) {
        setError('You must be on campus to mark attendance');
        return;
      }
      
      setVerificationMode(action);
      setShowFaceVerification(true);
    } catch (error) {
      console.error('Location error:', error);
      setError('Failed to verify location. Please enable location services.');
    }
  };

  const handleVerificationSuccess = async () => {
    try {
      setLoading(true);
      const location = await getCurrentLocation();
      const wifiSSID = await getCurrentWifiSSID();
      
      if (verificationMode === 'checkIn') {
        const result = await checkIn(user.uid, location, wifiSSID);
        setTodayAttendance({
          ...todayAttendance,
          checkIn: { time: new Date() },
          isLate: result.isLate,
          status: 'present'
        });
      } else if (verificationMode === 'checkOut') {
        const result = await checkOut(user.uid, location, wifiSSID);
        setTodayAttendance({
          ...todayAttendance,
          checkOut: { time: new Date() },
          isEarlyCheckout: result.isEarlyCheckout,
          status: result.status
        });
      }
      
      setShowFaceVerification(false);
    } catch (error) {
      console.error('Attendance error:', error);
      setError(error.message || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleShowWarning = (warning) => {
    setSelectedWarning(warning);
    setShowWarningModal(true);
  };

  const handleMarkWarningAsRead = async () => {
    if (!selectedWarning || !userData) return;
    
    try {
      // Find the warning in the user's warnings array
      const updatedWarnings = userData.warnings?.map(warning => {
        if (warning.timestamp.seconds === selectedWarning.timestamp.seconds) {
          return { ...warning, read: true };
        }
        return warning;
      });
      
      // Update the user data
      await updateUserData(user.uid, { warnings: updatedWarnings });
      
      // Update local state
      setUserData({
        ...userData,
        warnings: updatedWarnings
      });
      
      setShowWarningModal(false);
    } catch (error) {
      console.error('Error marking warning as read:', error);
    }
  };

  // Check if current time is within allowed check-in period (9 AM to 10 AM)
  const isCheckInTime = () => {
    const now = new Date();
    const hours = now.getHours();
    return hours >= 9 && hours < 10;
  };

  // Check if current time is within allowed check-out period (4 PM to 5 PM)
  const isCheckOutTime = () => {
    const now = new Date();
    const hours = now.getHours();
    return hours >= 16 && hours < 17;
  };

  // Get unread warnings count
  const getUnreadWarningsCount = () => {
    if (!userData || !userData.warnings) return 0;
    return userData.warnings.filter(warning => !warning.read).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 to-blue-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  // Calculate attendance percentage (if available)
  const calculateAttendancePercentage = () => {
    if (!userData || !userData.attendanceStats) return null;
    const { present, total } = userData.attendanceStats;
    if (!total) return 0;
    return Math.round((present / total) * 100);
  };

  const attendancePercentage = calculateAttendancePercentage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section with enhanced styling */}
        <div className="bg-white shadow-lg rounded-2xl p-6 mb-8 border border-indigo-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
                Welcome, {userData?.firstName || 'User'}!
              </h1>
              <p className="mt-1 text-sm text-gray-600">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
            </div>
            <div className="flex items-center mt-4 md:mt-0">
              {/* Warnings Indicator with better styling */}
              {getUnreadWarningsCount() > 0 && (
                <button
                  onClick={() => handleShowWarning(userData.warnings.find(w => !w.read))}
                  className="mr-6 relative group"
                >
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center animate-pulse">
                    {getUnreadWarningsCount()}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-500 group-hover:text-yellow-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-md hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-md transition-all duration-200 ease-in-out hover:shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Status Overview Card (New) */}
        <div className="bg-white shadow-lg rounded-2xl p-6 mb-8 border border-indigo-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 flex items-center justify-between shadow-sm border border-blue-100">
              <div>
                <p className="text-sm font-medium text-blue-800">Current Status</p>
                <p className="mt-1 text-xl font-bold text-blue-900">
                  {todayAttendance?.checkIn 
                    ? (todayAttendance?.checkOut 
                      ? 'Checked Out' 
                      : 'Checked In')
                    : 'Not Marked Yet'}
                </p>
              </div>
              <div className="rounded-full bg-white p-3 shadow-md">
                <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 flex items-center justify-between shadow-sm border border-green-100">
              <div>
                <p className="text-sm font-medium text-green-800">Check-in Time</p>
                <p className="mt-1 text-xl font-bold text-green-900">
                  {todayAttendance?.checkIn 
                    ? format(new Date(todayAttendance.checkIn.time), 'h:mm a')
                    : '-- : --'}
                </p>
              </div>
              <div className="rounded-full bg-white p-3 shadow-md">
                <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 flex items-center justify-between shadow-sm border border-purple-100">
              <div>
                <p className="text-sm font-medium text-purple-800">Check-out Time</p>
                <p className="mt-1 text-xl font-bold text-purple-900">
                  {todayAttendance?.checkOut 
                    ? format(new Date(todayAttendance.checkOut.time), 'h:mm a')
                    : '-- : --'}
                </p>
              </div>
              <div className="rounded-full bg-white p-3 shadow-md">
                <svg className="h-8 w-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions with improved styling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div 
            onClick={() => navigate('/mark-attendance')}
            className="bg-white shadow-lg rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-indigo-100"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 p-3 shadow-md">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-semibold text-gray-900">Mark Attendance</h3>
                <p className="text-sm text-gray-500">Record your daily attendance</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/attendance-report')}
            className="bg-white shadow-lg rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-green-100"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 p-3 shadow-md">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-semibold text-gray-900">View Report</h3>
                <p className="text-sm text-gray-500">Check your attendance history</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setShowLeaveModal(true)}
            className="bg-white shadow-lg rounded-2xl p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-purple-100"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 p-3 shadow-md">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-semibold text-gray-900">Apply for Leave</h3>
                <p className="text-sm text-gray-500">Submit leave application</p>
              </div>
            </div>
          </div>
        </div>

        {/* User Information with improved styling */}
        <div className="bg-white shadow-lg rounded-2xl p-6 border border-indigo-100">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <svg className="h-6 w-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Employee Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Employee ID</p>
              <p className="mt-1 text-lg font-semibold text-indigo-900">{userData?.employeeId || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Department</p>
              <p className="mt-1 text-lg font-semibold text-indigo-900">{userData?.department || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="mt-1 text-lg font-semibold text-indigo-900">{userData?.email || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="mt-1 text-lg font-semibold text-indigo-900">{userData?.phone || 'N/A'}</p>
            </div>
          </div>
        </div>
        
        {/* Recent Warnings (if any) with improved styling */}
        {userData?.warnings && userData.warnings.length > 0 && (
          <div className="bg-white shadow-lg rounded-2xl p-6 mt-8 border border-yellow-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Recent Warnings
            </h2>
            <div className="space-y-4">
              {userData.warnings.slice(0, 3).map((warning, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-xl ${
                    warning.severity === 'high' 
                      ? 'bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500' 
                      : warning.severity === 'medium'
                        ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500'
                        : 'bg-gradient-to-r from-orange-50 to-amber-50 border-l-4 border-orange-500'
                  } ${!warning.read ? 'ring-2 ring-offset-2 ring-yellow-300 animate-pulse' : ''} shadow-md`}
                >
                  <div className="flex justify-between">
                    <div className="flex">
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${
                        warning.severity === 'high' 
                          ? 'text-red-500' 
                          : warning.severity === 'medium'
                            ? 'text-yellow-500'
                            : 'text-orange-500'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="ml-3">
                        <h3 className={`text-sm font-semibold ${
                          warning.severity === 'high' 
                            ? 'text-red-800' 
                            : warning.severity === 'medium'
                              ? 'text-yellow-800'
                              : 'text-orange-800'
                        }`}>
                          {warning.reason}
                          {!warning.read && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                              New
                            </span>
                          )}
                        </h3>
                        <div className="mt-1 text-sm text-gray-700">
                          <p>{warning.description}</p>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          {warning.timestamp?.toDate 
                            ? format(warning.timestamp.toDate(), 'MMM d, yyyy') 
                            : 'Date not available'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleShowWarning(warning)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm font-medium hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Face Verification Modal */}
        {showFaceVerification && (
          <FaceVerification
            onClose={() => setShowFaceVerification(false)}
            onSuccess={handleVerificationSuccess}
            faceDescriptor={user?.faceDescriptor}
          />
        )}
        
        {/* Warning Modal */}
        {showWarningModal && selectedWarning && (
          <div className="fixed inset-0 flex items-center justify-center z-10">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm"></div>
            <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full p-6 z-20">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-medium ${
                  selectedWarning.severity === 'high' 
                    ? 'text-red-800' 
                    : selectedWarning.severity === 'medium'
                      ? 'text-yellow-800'
                      : 'text-orange-800'
                }`}>
                  Attendance Warning
                </h3>
                <button
                  onClick={() => setShowWarningModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-6">
                <div className={`p-4 rounded-md ${
                  selectedWarning.severity === 'high' 
                    ? 'bg-red-50' 
                    : selectedWarning.severity === 'medium'
                      ? 'bg-yellow-50'
                      : 'bg-orange-50'
                }`}>
                  <div className="flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${
                      selectedWarning.severity === 'high' 
                        ? 'text-red-500' 
                        : selectedWarning.severity === 'medium'
                          ? 'text-yellow-500'
                          : 'text-orange-500'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="ml-3">
                      <h3 className="text-sm font-semibold">
                        {selectedWarning.reason}
                      </h3>
                      <div className="mt-2 text-sm">
                        <p>{selectedWarning.description}</p>
                      </div>
                      <div className="mt-4">
                        <div className="-mx-2 -my-1.5 flex">
                          {selectedWarning.dateRange && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2">
                              Period: {format(new Date(selectedWarning.dateRange.startDate), 'MMM d')} - {format(new Date(selectedWarning.dateRange.endDate), 'MMM d, yyyy')}
                            </span>
                          )}
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedWarning.severity === 'high' 
                              ? 'bg-red-100 text-red-800' 
                              : selectedWarning.severity === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-orange-100 text-orange-800'
                          }`}>
                            {selectedWarning.severity.charAt(0).toUpperCase() + selectedWarning.severity.slice(1)} Severity
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-md mb-6">
                <p className="text-sm text-gray-500">
                  Issued by: <span className="font-medium text-gray-900">{selectedWarning.adminName || 'Admin'}</span>
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Date: <span className="font-medium text-gray-900">
                    {selectedWarning.timestamp?.toDate 
                      ? format(selectedWarning.timestamp.toDate(), 'MMMM d, yyyy') 
                      : 'Date not available'}
                  </span>
                </p>
              </div>
              
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={handleMarkWarningAsRead}
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                >
                  Acknowledge and Mark as Read
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Leave Application Modal */}
        {showLeaveModal && (
          <LeaveApplication onClose={() => setShowLeaveModal(false)} />
        )}
      </div>
    </div>
  );
}

export default Dashboard; 