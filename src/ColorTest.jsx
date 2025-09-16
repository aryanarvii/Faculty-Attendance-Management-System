function ColorTest() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Color Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Richblack colors */}
        <div className="p-4 bg-richblack-900 text-white">bg-richblack-900</div>
        <div className="p-4 bg-richblack-800 text-white">bg-richblack-800</div>
        <div className="p-4 bg-richblack-700 text-white">bg-richblack-700</div>
        <div className="p-4 bg-richblack-200 text-black">bg-richblack-200</div>
        <div className="p-4 bg-richblack-100 text-black">bg-richblack-100</div>
        <div className="p-4 bg-richblack-25 text-black">bg-richblack-25</div>
        <div className="p-4 bg-richblack-5 text-black">bg-richblack-5</div>
        
        {/* Primary colors */}
        <div className="p-4 bg-primary-700 text-white">bg-primary-700</div>
        <div className="p-4 bg-primary-600 text-white">bg-primary-600</div>
        <div className="p-4 bg-primary-500 text-white">bg-primary-500</div>
        
        {/* Other colors */}
        <div className="p-4 bg-blue-100 text-white">bg-blue-100</div>
        <div className="p-4 bg-pink-200 text-white">bg-pink-200</div>
        <div className="p-4 bg-yellow-50 text-black">bg-yellow-50</div>
        
        {/* Default Tailwind colors for comparison */}
        <div className="p-4 bg-blue-500 text-white">Default bg-blue-500</div>
        <div className="p-4 bg-red-500 text-white">Default bg-red-500</div>
      </div>
    </div>
  );
}

export default ColorTest; 