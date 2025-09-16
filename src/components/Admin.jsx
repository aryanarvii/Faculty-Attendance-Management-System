import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllUsers, getAllUsersAttendance, getUserAttendanceStats, sendAttendanceWarning } from '../firebase/adminService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
// Import recharts components
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { calculateAttendancePercentage } from '../utils/helpers';
import HolidayManagement from './HolidayManagement';
import LeaveManagement from './LeaveManagement';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config'

function Admin() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('attendance');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [departments, setDepartments] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUserStats, setSelectedUserStats] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date().setDate(1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [warningForm, setWarningForm] = useState({
    reason: '',
    description: '',
    severity: 'low'
  });
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingUserId, setLoadingUserId] = useState(null);
  const [userAttendancePercentages, setUserAttendancePercentages] = useState({});
  const [loadingPercentages, setLoadingPercentages] = useState(false);
  const [warningFromDetails, setWarningFromDetails] = useState(false);

  // Add COLORS array for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Define tabs
  const tabs = [
    { id: 'attendance', label: 'Attendance Reports' },
    { id: 'employees', label: 'Manage Employees' },
    { id: 'holidays', label: 'Holiday Management' },
    { id: 'leaves', label: 'Leave Management' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all users
        const allUsers = await getAllUsers();
        
        // Check for face registration status in both collections
        const usersWithUpdatedFaceStatus = await Promise.all(allUsers.map(async (user) => {
          // First check if faceData exists and has proper registration
          if (user.faceData && user.faceData.faceRegistered && user.faceData.personId) {
            return { ...user, faceRegistered: true };
          }
          
          // If not, check in users collection
          try {
            const userRef = doc(db, 'users', user.id);
            const userSnap = await getDoc(userRef);
            
            // Check if user exists in users collection and has face descriptor
            const faceRegistered = userSnap.exists() && 
              (!!userSnap.data()?.faceDescriptor || userSnap.data()?.faceRegistered);
            
            return { ...user, faceRegistered };
          } catch (err) {
            console.error('Error checking face status for user:', user.id, err);
            return user;
          }
        }));
        
        setUsers(usersWithUpdatedFaceStatus);
        setFilteredUsers(usersWithUpdatedFaceStatus);
        
        // Extract unique departments
        const uniqueDepartments = [...new Set(usersWithUpdatedFaceStatus.map(user => user.department).filter(Boolean))];
        setDepartments(uniqueDepartments);
        
        // Fetch attendance data
        const attendance = await getAllUsersAttendance(dateRange.startDate, dateRange.endDate);
        setAttendanceData(attendance);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    // Apply filters
    let filtered = [...users];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.firstName?.toLowerCase().includes(term) || 
         user.lastName?.toLowerCase().includes(term) ||
         user.email?.toLowerCase().includes(term) ||
         user.employeeId?.toLowerCase().includes(term))
      );
    }
    
    if (filterDepartment) {
      filtered = filtered.filter(user => user.department === filterDepartment);
    }
    
    setFilteredUsers(filtered);
  }, [users, searchTerm, filterDepartment]);

  useEffect(() => {
    const calculatePercentages = async () => {
      try {
        if (users.length === 0) return;
        
        setLoadingPercentages(true);
        const percentages = {};
        
        // Process each user
        for (const user of users) {
          // Get attendance stats directly for each user using the same date range
          const stats = await getUserAttendanceStats(user.id, dateRange.startDate, dateRange.endDate);
          
          if (stats) {
            const presentDays = stats.present || 0;
            const totalDays = stats.total || 0;
            percentages[user.id] = totalDays > 0 
              ? Math.round((presentDays / totalDays) * 100) 
              : 0;
          } else {
            percentages[user.id] = 0;
          }
        }
        
        setUserAttendancePercentages(percentages);
      } catch (error) {
        console.error("Error calculating attendance percentages:", error);
      } finally {
        setLoadingPercentages(false);
      }
    };
    
    calculatePercentages();
  }, [users, dateRange, getUserAttendanceStats]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDateChange = (e) => {
    setDateRange(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleShowUserDetails = async (userId) => {
    try {
      setLoadingDetails(true);
      setLoadingUserId(userId);
      const user = users.find(u => u.id === userId);
      setSelectedUser(user);
      
      // Get attendance stats for the selected user
      const stats = await getUserAttendanceStats(userId, dateRange.startDate, dateRange.endDate);
      setSelectedUserStats(stats);
      
      // Show the details modal instead of rendering in-page
      setShowDetailsModal(true);
      setLoadingDetails(false);
      setLoadingUserId(null);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to fetch user details');
      setLoadingDetails(false);
      setLoadingUserId(null);
    }
  };

  const handleWarningFormChange = (e) => {
    const { name, value } = e.target;
    setWarningForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSendWarning = async () => {
    try {
      if (!selectedUser) return;
      
      setLoading(true);
      await sendAttendanceWarning(selectedUser.id, {
        ...warningForm,
        adminId: user.uid,
        adminName: `${user.displayName || 'Admin'}`,
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
      });
      
      toast.success('Warning sent successfully');
      setShowWarningModal(false);
      setWarningFromDetails(false);
      setWarningForm({
        reason: '',
        description: '',
        severity: 'low'
      });
    } catch (error) {
      console.error('Error sending warning:', error);
      toast.error('Failed to send warning');
    } finally {
      setLoading(false);
    }
  };

  const openWarningModal = (user) => {
    setSelectedUser(user);
    setShowWarningModal(true);
    setWarningFromDetails(showDetailsModal);
  };

  const handleRegisterEmployee = () => {
    navigate('/signup');
  };

  if (loading && !users.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section with Welcome Message */}
        <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 border border-indigo-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">Admin Dashboard</h1>
              <p className="mt-1 text-sm text-gray-600">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
              <p className="mt-2 text-md text-indigo-600">Welcome, {user?.displayName || 'Admin'}! You have admin privileges.</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 mt-4 md:mt-0 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-md hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 shadow-md transition-all duration-200 ease-in-out hover:shadow-lg"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs with improved styling and responsiveness */}
        <div className="mb-6">
          <div className="bg-white shadow-md rounded-2xl p-2 border border-indigo-100">
            <nav className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  } flex-1 whitespace-nowrap py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200`}
                >
                  {tab.label}
                </button>
              ))}
              <button
                onClick={handleRegisterEmployee}
                className="flex-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 whitespace-nowrap py-3 px-4 rounded-xl font-medium text-sm transition-all duration-200"
              >
                Register New Employee
              </button>
            </nav>
          </div>
        </div>

        {/* Quick Stats Cards - Improved responsiveness */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white shadow-lg rounded-2xl p-6 border border-indigo-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 p-3 shadow-md">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-semibold text-gray-900">Total Employees</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">{users.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-2xl p-6 border border-green-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 p-3 shadow-md">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-semibold text-gray-900">Present Today</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
                  {attendanceData.filter(a => a.date === format(new Date(), 'yyyy-MM-dd') && a.status === 'present').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow-lg rounded-2xl p-6 border border-red-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="rounded-lg bg-gradient-to-r from-red-500 to-pink-600 p-3 shadow-md">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5">
                <h3 className="text-lg font-semibold text-gray-900">Absent Today</h3>
                <p className="text-3xl font-bold bg-gradient-to-r from-red-500 to-pink-600 bg-clip-text text-transparent">
                  {attendanceData.filter(a => a.date === format(new Date(), 'yyyy-MM-dd') && a.status === 'absent').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'attendance' && (
          <div>
            {/* Date Range Selector - Improved UI */}
            <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 border border-indigo-100">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Date Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">From</label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="date"
                      id="startDate"
                      name="startDate"
                      value={dateRange.startDate}
                      onChange={handleDateChange}
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {/* <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg> */}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">To</label>
                  <div className="relative rounded-md shadow-sm">
                    <input
                      type="date"
                      id="endDate"
                      name="endDate"
                      value={dateRange.endDate}
                      onChange={handleDateChange}
                      className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {/* <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg> */}
                    </div>
                  </div>
                </div>
                <div className="flex items-end space-x-2">
                  <button 
                    onClick={() => {
                      const today = new Date();
                      setDateRange({
                        startDate: format(new Date().setDate(1), 'yyyy-MM-dd'),
                        endDate: format(today, 'yyyy-MM-dd')
                      });
                    }}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                  >
                    Current Month
                  </button>
                  <button 
                    onClick={() => {
                      const today = new Date();
                      const lastWeek = new Date(today);
                      lastWeek.setDate(today.getDate() - 7);
                      setDateRange({
                        startDate: format(lastWeek, 'yyyy-MM-dd'),
                        endDate: format(today, 'yyyy-MM-dd')
                      });
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                  >
                    Last 7 Days
                  </button>
                </div>
              </div>
            </div>
            
            {/* Filter Section - Improved UI */}
            <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 border border-indigo-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="departmentFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Department</label>
                  <div className="relative rounded-md shadow-sm">
                    <select
                      id="departmentFilter"
                      value={filterDepartment}
                      onChange={(e) => setFilterDepartment(e.target.value)}
                      className="block w-full rounded-md border-gray-300 pl-3 pr-10 py-2 text-base focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="">All Departments</option>
                      {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                      {/* <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg> */}
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      name="search"
                      id="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 rounded-md border-gray-300 pl-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Search by name, email, or employee ID"
                    />
                    {searchTerm && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button
                          onClick={() => setSearchTerm('')}
                          className="text-gray-400 hover:text-gray-500 focus:outline-none"
                        >
                          <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Users List - Improved table styling */}
            <div className="bg-white shadow-lg rounded-2xl overflow-hidden mb-6 border border-indigo-100">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee ID
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Attendance %
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.department || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.employeeId || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {loadingPercentages ? (
                            <div className="flex items-center">
                              <svg className="animate-spin h-4 w-4 mr-2 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-sm text-gray-500">Calculating...</span>
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full ${
                                    userAttendancePercentages[user.id] >= 90 ? 'bg-green-500' :
                                    userAttendancePercentages[user.id] >= 75 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`} 
                                  style={{ width: `${userAttendancePercentages[user.id] || 0}%` }}
                                ></div>
                              </div>
                              <span className="ml-2 text-sm font-medium text-gray-700">
                                {userAttendancePercentages[user.id] || 0}%
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleShowUserDetails(user.id)}
                            className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 focus:bg-indigo-100 mr-4 px-2 py-1 rounded transition-colors"
                          >
                            {loadingDetails && loadingUserId === user.id ? 
                              <span className="inline-flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                              </span> 
                              : 'View Details'
                            }
                          </button>
                          <button
                            onClick={() => openWarningModal(user)}
                            className="text-red-600 hover:text-red-900 hover:bg-red-50 focus:bg-red-100 px-2 py-1 rounded transition-colors"
                          >
                            Send Warning
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'employees' && (
          <div className="bg-white shadow-lg rounded-2xl p-6 mb-6 border border-indigo-100">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Manage Employees</h2>
            
            {/* Search */}
            <div className="mb-6">
              <label htmlFor="employeeSearch" className="block text-sm font-medium text-gray-700">Search Employees</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="employeeSearch"
                  id="employeeSearch"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Search by name, email, or employee ID"
                />
              </div>
            </div>
            
            {/* Department Filter */}
            <div className="mb-6">
              <label htmlFor="departmentFilter" className="block text-sm font-medium text-gray-700">Filter by Department</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <select
                  id="departmentFilter"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Employees Table - Add attendance percentage column */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employee ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Face Registered
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attendance %
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName} {user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.department || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.employeeId || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.isAdmin ? 'Admin' : 'Employee'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.faceRegistered ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.faceRegistered ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {loadingPercentages ? (
                          <div className="flex items-center">
                            <svg className="animate-spin h-4 w-4 mr-2 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm text-gray-500">Calculating...</span>
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2.5">
                              <div 
                                className={`h-2.5 rounded-full ${
                                  userAttendancePercentages[user.id] >= 90 ? 'bg-green-500' :
                                  userAttendancePercentages[user.id] >= 75 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`} 
                                style={{ width: `${userAttendancePercentages[user.id] || 0}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-sm font-medium text-gray-700">
                              {userAttendancePercentages[user.id] || 0}%
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleShowUserDetails(user.id)}
                          className="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 focus:bg-indigo-100 mr-2 px-2 py-1 rounded transition-colors"
                        >
                          {loadingDetails && loadingUserId === user.id ? 
                            <span className="inline-flex items-center">
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </span> 
                            : 'View Details'
                          }
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {activeTab === 'holidays' && (
          <div className="bg-white shadow-lg rounded-2xl p-6 border border-indigo-100">
            <HolidayManagement />
          </div>
        )}

        {activeTab === 'leaves' && (
          <div className="bg-white shadow-lg rounded-2xl p-6 border border-indigo-100">
            <LeaveManagement />
          </div>
        )}

        {/* Warning Modal */}
        {showWarningModal && (
          <div className={`fixed inset-0 flex items-center justify-center ${warningFromDetails ? 'z-30' : 'z-10'}`}>
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75"></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Send Attendance Warning
                </h3>
                <button
                  onClick={() => {
                    setShowWarningModal(false);
                    setWarningFromDetails(false);
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-500">
                  Sending warning to: <span className="font-medium">{selectedUser?.firstName} {selectedUser?.lastName}</span>
                </p>
              </div>
              
              <form>
                <div className="mb-4">
                  <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason</label>
                  <select
                    id="reason"
                    name="reason"
                    value={warningForm.reason}
                    onChange={handleWarningFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    <option value="">Select reason</option>
                    <option value="Poor Attendance">Poor Attendance</option>
                    <option value="Frequent Late Arrivals">Frequent Late Arrivals</option>
                    <option value="Early Departures">Early Departures</option>
                    <option value="Irregular Attendance Pattern">Irregular Attendance Pattern</option>
                    <option value="No Face Registration">No Face Registration</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="severity" className="block text-sm font-medium text-gray-700">Severity</label>
                  <select
                    id="severity"
                    name="severity"
                    value={warningForm.severity}
                    onChange={handleWarningFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="3"
                    value={warningForm.description}
                    onChange={handleWarningFormChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    placeholder="Provide details about the warning"
                    required
                  ></textarea>
                </div>
                
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    onClick={handleSendWarning}
                    disabled={loading}
                    className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:text-sm"
                  >
                    {loading ? 'Sending...' : 'Send Warning'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add User Attendance Details Modal with Pie Chart */}
        {showDetailsModal && selectedUser && selectedUserStats && (
          <div className="fixed inset-0 flex items-center justify-center z-10">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 backdrop-blur-sm"></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 z-20">
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white pt-2 pb-4 z-10">
                <h2 className="text-2xl font-bold text-gray-900">
                  Attendance Report: {selectedUser.firstName} {selectedUser.lastName}
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Employee Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Employee Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Employee ID</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedUser.employeeId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Department</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedUser.department || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Email</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedUser.email || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date Range</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {format(new Date(dateRange.startDate), 'MMM d, yyyy')} - {format(new Date(dateRange.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Attendance Stats in Cards */}
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                      <p className="text-sm font-medium text-green-800">Present Days</p>
                      <p className="text-3xl font-bold text-green-700">{selectedUserStats.present}</p>
                      <p className="text-xs text-green-600 mt-1">
                        {((selectedUserStats.present / selectedUserStats.total) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                      <p className="text-sm font-medium text-red-800">Absent Days</p>
                      <p className="text-3xl font-bold text-red-700">{selectedUserStats.absent}</p>
                      <p className="text-xs text-red-600 mt-1">
                        {((selectedUserStats.absent / selectedUserStats.total) * 100).toFixed(1)}% of total
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
                      <p className="text-sm font-medium text-yellow-800">Late Check-ins</p>
                      <p className="text-3xl font-bold text-yellow-700">{selectedUserStats.late}</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        {selectedUserStats.present > 0 
                          ? ((selectedUserStats.late / selectedUserStats.present) * 100).toFixed(1) 
                          : 0}% of present days
                      </p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
                      <p className="text-sm font-medium text-orange-800">Early Checkouts</p>
                      <p className="text-3xl font-bold text-orange-700">{selectedUserStats.earlyCheckout || 0}</p>
                      <p className="text-xs text-orange-600 mt-1">
                        {selectedUserStats.present > 0 
                          ? (((selectedUserStats.earlyCheckout || 0) / selectedUserStats.present) * 100).toFixed(1) 
                          : 0}% of present days
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Pie Chart Section - Fixed text overflow */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Distribution</h3>
                  <div className="bg-white rounded-lg shadow p-4 h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Present', value: selectedUserStats.present - selectedUserStats.late },
                            { name: 'Late', value: selectedUserStats.late },
                            { name: 'Absent', value: selectedUserStats.absent },
                            { name: 'Early Checkout', value: selectedUserStats.earlyCheckout || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                        >
                          {[
                            { name: 'Present', value: selectedUserStats.present - selectedUserStats.late },
                            { name: 'Late', value: selectedUserStats.late },
                            { name: 'Absent', value: selectedUserStats.absent },
                            { name: 'Early Checkout', value: selectedUserStats.earlyCheckout || 0 },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [
                            `${value} day${value !== 1 ? 's' : ''}`, 
                            name
                          ]} 
                        />
                        <Legend layout="vertical" verticalAlign="middle" align="right" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Attendance Calendar (compact version) */}
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Monthly Calendar</h3>
                    <div className="grid grid-cols-7 gap-1">
                      {selectedUserStats.dates.map((date, index) => (
                        <div 
                          key={index}
                          className={`
                            p-2 text-center text-xs md:text-sm
                            ${date.status === 'present' 
                              ? date.isLate 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : date.isEarlyCheckout
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }
                            rounded-md hover:opacity-80 transition-opacity cursor-pointer
                          `}
                          title={`${date.date} - ${date.status === 'present' 
                            ? date.isLate 
                              ? 'Present (Late)' 
                              : date.isEarlyCheckout
                                ? 'Present (Early Checkout)'
                                : 'Present' 
                            : 'Absent'}`}
                        >
                          {new Date(date.date).getDate()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => openWarningModal(selectedUser)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 mr-4"
                >
                  Send Warning
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin; 