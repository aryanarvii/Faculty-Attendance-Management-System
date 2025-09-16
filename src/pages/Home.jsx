import React from 'react';

const Home = () => {
  return (
    <div className="w-[100vw] h-[100vh] bg-richblack-900 flex items-center justify-center">
      <div className="w-[1000px] h-[500px] bg-richblack-800 rounded-lg shadow-md">
        <div className="flex flex-col items-center justify-center h-full">
          <h1 className="text-4xl font-bold text-richblack-5 mb-6">Faculty Attendance Portal</h1>
          <p className="text-lg text-richblack-100 mb-8">Welcome to the automated attendance management system</p>
          <a 
            href="/login"
            className="px-8 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Login to Portal
          </a>
        </div>
      </div>

    </div>
  )
}

export default Home;
