import React, { useEffect, useMemo, useState } from "react";
import { axiosinstanse } from "../utils/apiAxios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest"); // newest | oldest

  const nav = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await axiosinstanse.get("/api/auth");
        setData(res.data.data || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load users. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = data.filter((user) => {
      if (!q) return true;
      const name = (user?.name || "").toLowerCase();
      const email = (user?.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    });

    const sorted = [...filtered].sort((a, b) => {
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });

    return sorted;
  }, [data, query, sort]);

  const totalUsers = data.length;
  const shownUsers = filteredAndSorted.length;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User List</h1>
            <p className="text-sm text-gray-600 mt-1">
              {loading ? "Loading users..." : `${totalUsers} total user${totalUsers === 1 ? "" : "s"}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => nav("/add")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow-sm"
            >
              Add User
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-5 bg-white border rounded-xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700">Search</label>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="mt-1 w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:w-52">
              <label className="text-sm font-medium text-gray-700">Sort</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="mt-1 w-full px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="newest">Newest</option>
                <option value="oldest">Oldest</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{shownUsers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {loading && (
        <div className="max-w-3xl mx-auto">
          <div className="rounded-xl bg-white border shadow-sm p-6 text-center text-gray-600">
            Loading...
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="max-w-3xl mx-auto mb-4">
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4">
            {error}
          </div>
        </div>
      )}

      {/* User Cards */}
      {!loading && !error && shownUsers === 0 && (
        <div className="max-w-xl mx-auto mt-10">
          <div className="bg-white border rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-700 font-semibold">No users found</p>
            <p className="text-sm text-gray-500 mt-2">
              {query.trim() ? "Try a different search." : "Add your first user to get started."}
            </p>
            <button
              onClick={() => nav("/add")}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg transition shadow-sm"
            >
              Add User
            </button>
          </div>
        </div>
      )}

      {!loading && !error && shownUsers > 0 && (
        <div className="max-w-3xl mx-auto grid gap-4">
          {filteredAndSorted.map((user) => {
            const created = user?.createdAt
              ? new Date(user.createdAt).toLocaleDateString()
              : "—";

            return (
              <div
                key={user._id}
                className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {user?.name || "(No name)"}
                    </p>
                    <p className="text-gray-600 mt-1">
                      Email: <span className="font-medium">{user?.email || "—"}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-900">{created}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Home;

