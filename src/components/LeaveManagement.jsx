import { useState, useEffect } from 'react';
import { getAllLeaves, updateLeaveStatus } from '../firebase/leaveService';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [adminComment, setAdminComment] = useState('');

  useEffect(() => {
    loadLeaves();
  }, []);

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const leavesData = await getAllLeaves();
      console.log('Loaded leaves data:', leavesData);
      setLeaves(leavesData);
    } catch (error) {
      console.error('Error loading leaves:', error);
      toast.error('Failed to load leave applications');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLeaves = () => {
    return leaves.filter(leave => {
      // Filter by status
      if (filterStatus !== 'all' && leave.status !== filterStatus) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        return (
          leave.userName?.toLowerCase().includes(searchTermLower) ||
          leave.employeeId?.toLowerCase().includes(searchTermLower) ||
          leave.department?.toLowerCase().includes(searchTermLower) ||
          leave.reason?.toLowerCase().includes(searchTermLower)
        );
      }

      return true;
    });
  };

  const handleApprove = async () => {
    if (!selectedLeave) return;

    try {
      await updateLeaveStatus(selectedLeave.id, 'approved', adminComment);
      toast.success('Leave application approved successfully');
      
      // Update local state
      setLeaves(leaves.map(leave => 
        leave.id === selectedLeave.id 
          ? { ...leave, status: 'approved', adminComment } 
          : leave
      ));
      
      // Close modal and reset state
      setShowApproveModal(false);
      setSelectedLeave(null);
      setAdminComment('');
    } catch (error) {
      console.error('Error approving leave:', error);
      toast.error('Failed to approve leave application');
    }
  };

  const handleReject = async () => {
    if (!selectedLeave) return;

    try {
      await updateLeaveStatus(selectedLeave.id, 'rejected', adminComment);
      toast.success('Leave application rejected');
      
      // Update local state
      setLeaves(leaves.map(leave => 
        leave.id === selectedLeave.id 
          ? { ...leave, status: 'rejected', adminComment } 
          : leave
      ));
      
      // Close modal and reset state
      setShowRejectModal(false);
      setSelectedLeave(null);
      setAdminComment('');
    } catch (error) {
      console.error('Error rejecting leave:', error);
      toast.error('Failed to reject leave application');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getLeaveTypeClass = (type) => {
    switch (type) {
      case 'sick':
        return 'bg-blue-100 text-blue-800';
      case 'personal':
        return 'bg-purple-100 text-purple-800';
      case 'casual':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy');
  };

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 mb-4">Leave Management</h2>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">Status Filter</label>
          <select
            id="statusFilter"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="block w-full rounded-md pl-3 pr-10 py-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div>
          <label htmlFor="leaveSearch" className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            id="leaveSearch"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, ID, department, or reason"
            className="block w-full rounded-md pl-3 pr-10 py-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Leave Applications Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : getFilteredLeaves().length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
          No leave applications found
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type & Reason
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getFilteredLeaves().map((leave) => (
                  <tr key={leave.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900">{leave.userName || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500">{leave.employeeId || 'No ID'}</div>
                        <div className="text-xs text-gray-500">{leave.department || 'No Department'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Applied: {leave.appliedAt?.toDate ? format(leave.appliedAt.toDate(), 'MMM d, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {leave.days || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getLeaveTypeClass(leave.type)}`}>
                        {leave.type} Leave
                      </span>
                      <div className="text-sm text-gray-900 mt-1 max-w-xs truncate">
                        {leave.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${getStatusBadgeClass(leave.status)}`}>
                        {leave.status}
                      </span>
                      {leave.adminComment && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          Note: {leave.adminComment}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {leave.status === 'pending' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setShowApproveModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setShowRejectModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedLeave && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Approve Leave Application</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to approve the leave application for <span className="font-semibold">{selectedLeave.userName}</span> from {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}?
            </p>
            
            <div className="mb-4">
              <label htmlFor="adminComment" className="block text-sm font-medium text-gray-700 mb-1">Comment (Optional)</label>
              <textarea
                id="adminComment"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Add an optional comment for the employee..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedLeave(null);
                  setAdminComment('');
                }}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                className="bg-green-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Leave Application</h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to reject the leave application for <span className="font-semibold">{selectedLeave.userName}</span> from {formatDate(selectedLeave.startDate)} to {formatDate(selectedLeave.endDate)}?
            </p>
            
            <div className="mb-4">
              <label htmlFor="adminComment" className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
              <textarea
                id="adminComment"
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                rows={3}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Provide a reason for rejecting this leave application..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedLeave(null);
                  setAdminComment('');
                }}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="bg-red-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaveManagement; 