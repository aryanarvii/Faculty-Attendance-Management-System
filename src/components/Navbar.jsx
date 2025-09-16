import React from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/ManipalLogo.png';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();

  // Hide Navbar if user is logged in
  if (user) return null;

  return (
    <div className="relative flex justify-between items-center w-11/12 max-w-[1160px]  mx-auto">
      <Link to="/">
        <img src={logo} width={190} height={60} alt="Logo" loading="lazy" className="bg-richblack-5 rounded-sm m-4"/>
      </Link>

      
      <div>
        <h1 className='absolute top-4 left-[37%] text-richblack-5 text-2xl font-bold'>Faculty Attendance Portal</h1>
      </div>

      <div className="flex items-center gap-x-4">
      
      </div>
    </div>
  );
};

export default Navbar;
