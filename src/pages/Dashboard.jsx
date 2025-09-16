// import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { getUserData } from '../firebase/userService';
// import { Link } from 'react-router-dom';
// import { useNavigate } from 'react-router-dom';
// import { auth } from '../firebase/config';
// import { CalendarToday, AccessTime, CheckCircle } from '@mui/icons-material';
// // import FaceVerification from '../components/FaceVerification';

// // Development mode flag
// const DEV_MODE = process.env.NODE_ENV === 'development';

// function Dashboard() {
//   const { user } = useAuth();
//   const [userData, setUserData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [attendanceStatus, setAttendanceStatus] = useState(null);
//   const [showFaceVerification, setShowFaceVerification] = useState(false);
//   const [currentTime] = useState(new Date());

//   // Fetch user data on component load
//   useEffect(() => {
//     const fetchUserData = async () => {
//       if (user && user.uid) {
//         try {
//           setLoading(true);
//           const data = await getUserData(user.uid);
//           setUserData(data);
//         } catch (error) {
//           console.error("Error fetching user data:", error);
//         } finally {
//           setLoading(false);
//         }
//       }
//     };

//     fetchUserData();
//   }, [user]);

//   // Check if current time is within allowed check-in period (9 AM to 10 AM)
//   const isCheckInTime = () => {
//     const hours = currentTime.getHours();
//     return hours >= 9 && hours < 10;
//   };

//   // Check if current time is within allowed check-out period (4 PM to 5 PM)
//   const isCheckOutTime = () => {
//     const hours = currentTime.getHours();
//     return hours >= 16 && hours < 17;
//   };

//   // Format date for display
//   const formatDate = (dateString) => {
//     if (!dateString) return 'N/A';
//     try {
//       const date = new Date(dateString);
//       return date.toLocaleDateString();
//     } catch (error) {
//       return dateString;
//     }
//   };

//   const handleAttendanceClick = () => {
//     setShowFaceVerification(true);
//   };

//   if (loading) {
//     return (
//       <div className="min-h-screen bg-gray-50 flex items-center justify-center">
//         <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
//         <p className="ml-3 text-indigo-600">Loading dashboard...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gray-50 p-8">
//       <div className="max-w-5xl mx-auto">
//         {/* Header Section */}
//         <div className="bg-white rounded-lg shadow-md p-6 mb-6">
//           <div className="flex flex-col md:flex-row md:justify-between md:items-center">
//             <div>
//               <h1 className="text-2xl font-bold text-gray-800">
//                 Welcome, {userData?.firstName} {userData?.lastName}
//               </h1>
//               <p className="text-gray-600 mt-1">{userData?.designation}</p>
//             </div>
//             <div className="mt-4 md:mt-0">
//               <Link 
//                 to="/attendance"
//                 className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 inline-block"
//               >
//                 Manage Attendance
//               </Link>
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
//           {/* Employee Information Card */}
//           <div className="bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="bg-indigo-600 px-6 py-4">
//               <h2 className="text-xl font-semibold text-white">Employee Information</h2>
//             </div>
//             <div className="p-6">
//               <ul className="space-y-4">
//                 <li className="flex border-b pb-2">
//                   <span className="font-medium w-1/3 text-gray-600">Employee ID:</span>
//                   <span className="text-gray-800">{userData?.employeeId || 'Not available'}</span>
//                 </li>
//                 <li className="flex border-b pb-2">
//                   <span className="font-medium w-1/3 text-gray-600">Department:</span>
//                   <span className="text-gray-800">{userData?.department || 'Not available'}</span>
//                 </li>
//                 <li className="flex border-b pb-2">
//                   <span className="font-medium w-1/3 text-gray-600">Designation:</span>
//                   <span className="text-gray-800">{userData?.designation || 'Not available'}</span>
//                 </li>
//                 <li className="flex border-b pb-2">
//                   <span className="font-medium w-1/3 text-gray-600">Email:</span>
//                   <span className="text-gray-800">{userData?.email || 'Not available'}</span>
//                 </li>
//                 <li className="flex border-b pb-2">
//                   <span className="font-medium w-1/3 text-gray-600">Phone:</span>
//                   <span className="text-gray-800">{userData?.phone || 'Not available'}</span>
//                 </li>
//                 <li className="flex">
//                   <span className="font-medium w-1/3 text-gray-600">Date of Joining:</span>
//                   <span className="text-gray-800">{formatDate(userData?.dateOfJoining) || 'Not available'}</span>
//                 </li>
//               </ul>
//             </div>
//           </div>

//           {/* Attendance Quick Summary */}
//           <div className="bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="bg-green-600 px-6 py-4">
//               <h2 className="text-xl font-semibold text-white">Today's Attendance</h2>
//             </div>
//             <div className="p-6">
//               <div className="mb-6">
//                 <p className="text-gray-600 mb-2">Current Status:</p>
//                 <div className="flex items-center">
//                   <div className={`w-3 h-3 rounded-full ${attendanceStatus?.checkedIn ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
//                   <span className="font-medium">
//                     {attendanceStatus?.checkedIn 
//                       ? (attendanceStatus?.checkedOut ? 'Completed' : 'Checked In') 
//                       : 'Not Checked In'}
//                   </span>
//                 </div>
//               </div>

//               <div className="grid grid-cols-2 gap-4 mb-6">
//                 <div className="border rounded-md p-3">
//                   <p className="text-sm text-gray-600">Check-in</p>
//                   <p className="font-semibold">
//                     {attendanceStatus?.checkInTime 
//                       ? new Date(attendanceStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
//                       : '---'}
//                   </p>
//                 </div>
//                 <div className="border rounded-md p-3">
//                   <p className="text-sm text-gray-600">Check-out</p>
//                   <p className="font-semibold">
//                     {attendanceStatus?.checkOutTime 
//                       ? new Date(attendanceStatus.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
//                       : '---'}
//                   </p>
//                 </div>
//               </div>

//               <div>
//                 <p className="text-gray-600 mb-2">Office Hours:</p>
//                 <ul className="text-sm space-y-1">
//                   <li>
//                     <span className="font-medium">Check-in:</span> 9:00 AM - 10:00 AM
//                   </li>
//                   <li>
//                     <span className="font-medium">Check-out:</span> 5:00 PM - 6:00 PM
//                   </li>
//                 </ul>
//               </div>

//               <div className="mt-6">
//                 {!attendanceStatus?.checkedIn && (
//                   <Link 
//                     to="/attendance"
//                     className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 inline-block w-full text-center"
//                   >
//                     Go to Check-in
//                   </Link>
//                 )}
//                 {attendanceStatus?.checkedIn && !attendanceStatus?.checkedOut && (
//                   <Link 
//                     to="/attendance"
//                     className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 inline-block w-full text-center"
//                   >
//                     Go to Check-out
//                   </Link>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* Quick Links and System Status */}
//         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//           <div className="bg-white rounded-lg shadow-md overflow-hidden lg:col-span-2">
//             <div className="bg-blue-600 px-6 py-4">
//               <h2 className="text-xl font-semibold text-white">Quick Links</h2>
//             </div>
//             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
//               <Link to="/attendance" className="border rounded-md p-4 hover:bg-gray-50 flex items-center">
//                 <div className="rounded-full bg-blue-100 p-3 mr-4">
//                   <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
//                   </svg>
//                 </div>
//                 <span className="font-medium">Attendance Management</span>
//               </Link>
//               <Link to="/profile" className="border rounded-md p-4 hover:bg-gray-50 flex items-center">
//                 <div className="rounded-full bg-green-100 p-3 mr-4">
//                   <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
//                   </svg>
//                 </div>
//                 <span className="font-medium">Profile Settings</span>
//               </Link>
//               <Link to="/reports" className="border rounded-md p-4 hover:bg-gray-50 flex items-center">
//                 <div className="rounded-full bg-purple-100 p-3 mr-4">
//                   <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
//                   </svg>
//                 </div>
//                 <span className="font-medium">Attendance Reports</span>
//               </Link>
//               <Link to="/help" className="border rounded-md p-4 hover:bg-gray-50 flex items-center">
//                 <div className="rounded-full bg-yellow-100 p-3 mr-4">
//                   <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
//                   </svg>
//                 </div>
//                 <span className="font-medium">Help & Support</span>
//               </Link>
//             </div>
//           </div>
          
//           <div className="bg-white rounded-lg shadow-md overflow-hidden">
//             <div className="bg-gray-600 px-6 py-4">
//               <h2 className="text-xl font-semibold text-white">System Status</h2>
//             </div>
//             <div className="p-6">
//               <div className="mb-4">
//                 <p className="text-gray-600 mb-2">Current Date & Time:</p>
//                 <p className="font-medium">{currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}</p>
//               </div>
//               <div className="mb-4">
//                 <p className="text-gray-600 mb-2">Face Registration:</p>
//                 <div className="flex items-center">
//                   <div className={`w-3 h-3 rounded-full ${userData?.faceRegistered ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
//                   <span className="font-medium">{userData?.faceRegistered ? 'Registered' : 'Not Registered'}</span>
//                 </div>
//               </div>
//               {DEV_MODE && (
//                 <div className="mt-4 bg-purple-100 text-purple-800 text-xs p-2 rounded">
//                   Development Mode: Face verification bypass enabled
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>

//         {/* Face Verification Modal (Commented out for now, using the Attendance page instead) */}
//         {/* {showFaceVerification && (
//           <FaceVerification
//             onClose={() => setShowFaceVerification(false)}
//             onSuccess={(time) => {
//               setAttendanceStatus(prev => ({
//                 ...prev,
//                 [attendanceStatus?.checkedIn ? 'checkedOut' : 'checkedIn']: true,
//                 [attendanceStatus?.checkedIn ? 'checkOutTime' : 'checkInTime']: time
//               }));
//               setShowFaceVerification(false);
//             }}
//           />
//         )} */}
//       </div>
//     </div>
//   );
// }

// export default Dashboard; 