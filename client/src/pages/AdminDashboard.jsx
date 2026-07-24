import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosInstance";
import toast from "react-hot-toast";

/**
 * AdminDashboard - Privileged administration interface with comprehensive user lists
 */
const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    active: "",
  });

  // Fetch users on mount and when pagination/filters change
  useEffect(() => {
    fetchUsers();
  }, [pagination.currentPage, filters]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", pagination.currentPage);
      params.append("limit", pagination.limit);
      
      if (filters.search) params.append("search", filters.search);
      if (filters.role) params.append("role", filters.role);
      if (filters.active) params.append("active", filters.active);

      const response = await axiosInstance.get(`/admin/users?${params}`);
      
      if (response.data.success) {
        setUsers(response.data.data.users);
        setPagination(prev => ({
          ...prev,
          ...response.data.data.pagination
        }));
      }
    } catch (error) {
      toast.error("Failed to fetch users");
      console.error("Fetch users error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}`, {
        active: !currentStatus,
      });
      toast.success(`User ${!currentStatus ? "activated" : "deactivated"} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update user");
    }
  };

  const revokeUserSessions = async (userId) => {
    if (!window.confirm("Are you sure you want to revoke all sessions for this user?")) {
      return;
    }
    
    try {
      await axiosInstance.post(`/admin/users/${userId}/revoke-sessions`);
      toast.success("All sessions revoked successfully");
    } catch {
      toast.error("Failed to revoke sessions");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold text-gray-900">{pagination.totalUsers}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Active Users</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Inactive Users</p>
          <p className="text-2xl font-bold text-red-600">
            {users.filter(u => !u.active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Admins</p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.role === "Admin").length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role Filter */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange("role", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Roles</option>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-40">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.active}
              onChange={(e) => handleFilterChange("active", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          {/* Search Button */}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === "Admin" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-gray-100 text-gray-700"
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.active 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {user.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleUserStatus(user._id, user.active)}
                        className={`mr-2 ${
                          user.active 
                            ? "text-red-600 hover:text-red-900" 
                            : "text-green-600 hover:text-green-900"
                        }`}
                      >
                        {user.active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => revokeUserSessions(user._id)}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Revoke Sessions
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Showing {((pagination.currentPage - 1) * pagination.limit) + 1} to{" "}
            {Math.min(pagination.currentPage * pagination.limit, pagination.totalUsers)} of{" "}
            {pagination.totalUsers} results
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={pagination.currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={pagination.currentPage >= pagination.totalPages}
              className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;