import React, { useEffect, useState } from "react";
import axios from "axios";
import { axiosinstanse } from "../utils/apiAxios";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [data, setData] = useState([]);
  const nav=useNavigate() 

  async function getData() {
    try {
      const res = await axiosinstanse.get('/api/auth')
      setData(res.data.data);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    getData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="flex justify-between items-center max-w-xl mx-auto mb-6">
        <h1 className="text-2xl font-bold">User List</h1>

        <button
        onClick={()=>nav('/add')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          Add User
        </button>
      </div>

      {/* User Cards */}
      {data.length === 0 ? (
        <p className="text-center text-gray-500">No users found</p>
      ) : (
        <div className="grid gap-4 max-w-xl mx-auto">
          {data.map((user) => (
            <div
              key={user._id}
              className="bg-white rounded-xl shadow p-4 border"
            >
              <p className="text-lg font-semibold">
                Name: <span className="font-normal">{user.name}</span>
              </p>
              <p className="text-gray-600">
                Email: <span className="font-medium">{user.email}</span>
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Created: {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
