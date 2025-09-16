import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAttendanceReport } from '../firebase/attendanceService';
import { getUserLeaveStats } from '../firebase/leaveService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
// Import recharts components
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

function AttendanceReport() {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date().setDate(1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  });
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    absent: 0,
    late: 0,
    early: 0
  });
  const [leaveStats, setLeaveStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    daysOnLeave: 0
  });
  const navigate = useNavigate();
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Add COLORS array for pie chart
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      console.log('Fetching attendance data with date range:', dateRange);
      
      // Fetch attendance data
      const response = await getAttendanceReport(user.uid, dateRange.startDate, dateRange.endDate);
      console.log('Received attendance data:', response.records.length, 'records');
      setAttendanceData(response.records);
      setStats(response.stats);
      
      // Fetch leave stats for the same period
      const leaves = await getUserLeaveStats(user.uid, dateRange.startDate, dateRange.endDate);
      setLeaveStats(leaves);
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAttendanceData();
    }
  }, [user]);

  const handleDateChange = (e) => {
    setDateRange(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '---';
    try {
      return format(new Date(timestamp), 'hh:mm a');
    } catch (e) {
      console.error('Error formatting time:', e);
      return '---';
    }
  };

  const getStatus = (record) => {
    if (!record.checkIn) return 'Absent';
    if (record.checkIn && !record.checkOut) return 'Checked In';
    return 'Present';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section with Back Button */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Attendance Report</h2>
            <p className="mt-2 text-sm text-gray-600">
              View and track your attendance records
            </p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 mr-2" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path 
                fillRule="evenodd" 
                d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                clipRule="evenodd" 
              />
            </svg>
            Back to Dashboard
          </button>
        </div>

        {/* Statistics Section with Pie Chart - New Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Statistics Cards */}
          <div className="bg-white shadow-lg rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-100 shadow-sm">
                <p className="text-sm font-medium text-green-800">Present Days</p>
                <p className="text-3xl font-bold text-green-700">{stats.present}</p>
                <p className="text-xs text-green-600 mt-1">
                  {stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) + '%' : '0%'} of total
                </p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-5 border border-red-100 shadow-sm">
                <p className="text-sm font-medium text-red-800">Absent Days</p>
                <p className="text-3xl font-bold text-red-700">{stats.absent - leaveStats.daysOnLeave}</p>
                <p className="text-xs text-red-600 mt-1">
                  {stats.total > 0 ? (((stats.absent - leaveStats.daysOnLeave) / stats.total) * 100).toFixed(1) + '%' : '0%'} of total
                </p>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border border-yellow-100 shadow-sm">
                <p className="text-sm font-medium text-yellow-800">Late Check-ins</p>
                <p className="text-3xl font-bold text-yellow-700">{stats.late}</p>
                <p className="text-xs text-yellow-600 mt-1">
                  {stats.present > 0 ? ((stats.late / stats.present) * 100).toFixed(1) + '%' : '0%'} of present days
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-5 border border-orange-100 shadow-sm">
                <p className="text-sm font-medium text-orange-800">Early Check-outs</p>
                <p className="text-3xl font-bold text-orange-700">{stats.early}</p>
                <p className="text-xs text-orange-600 mt-1">
                  {stats.present > 0 ? ((stats.early / stats.present) * 100).toFixed(1) + '%' : '0%'} of present days
                </p>
               </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-100 shadow-sm">
                <p className="text-sm font-medium text-purple-800">Leave Days</p>
                <p className="text-3xl font-bold text-purple-700">{leaveStats.daysOnLeave}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {stats.total > 0 ? ((leaveStats.daysOnLeave / stats.total) * 100).toFixed(1) + '%' : '0%'} of total
                </p>
              </div>
            </div>
          </div>
          
          {/* Pie Chart */}
          <div className="bg-white shadow-lg rounded-2xl p-6 border border-indigo-100">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Attendance Distribution</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Present', value: stats.present - stats.late },
                      { name: 'Late', value: stats.late },
                      { name: 'Absent', value: stats.absent - leaveStats.daysOnLeave },
                      { name: 'On Leave', value: leaveStats.daysOnLeave },
                      { name: 'Early Checkout', value: stats.early },
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
                      { name: 'Present', value: stats.present - stats.late },
                      { name: 'Late', value: stats.late },
                      { name: 'Absent', value: stats.absent - leaveStats.daysOnLeave },
                      { name: 'On Leave', value: leaveStats.daysOnLeave },
                      { name: 'Early Checkout', value: stats.early },
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
          </div>
        </div>

        {/* Filters Section with improved styling */}
        <div className="bg-white shadow-lg rounded-2xl p-6 mb-8 border border-indigo-100">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="date"
                  name="startDate"
                  value={dateRange.startDate}
                  onChange={handleDateChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateChange}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchAttendanceData}
                className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-2 rounded-md hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-md transition-all duration-200 ease-in-out hover:shadow-lg"
              >
                {loading ? (
                  <span className="inline-flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                  </span>
                ) : 'Refresh Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Table Section with improved styling */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="bg-white shadow-lg rounded-2xl p-6 text-center text-gray-500 border border-indigo-100">
            No attendance records found for the selected date range
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-2xl overflow-hidden border border-indigo-100">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check In
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Check Out
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {attendanceData.map((record) => (
                    <tr key={record.id || record.date} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {typeof record.date === 'string' && record.date.includes('-')
                          ? format(new Date(record.date), 'dd MMM yyyy')
                          : record.date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.checkIn?.time 
                          ? `${formatTime(record.checkIn.time)} ${record.checkIn.isLate ? '(Late)' : ''}`
                          : '---'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.checkOut?.time 
                          ? `${formatTime(record.checkOut.time)} ${record.checkOut.isEarly ? '(Early)' : ''}`
                          : '---'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            getStatus(record) === 'Present'
                              ? 'bg-green-100 text-green-800'
                              : getStatus(record) === 'Checked In'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {getStatus(record)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AttendanceReport; 