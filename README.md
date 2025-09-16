# Faculty Attendance Management System (AMS)

> A web-based system to manage faculty attendance efficiently, using face verification and location tracking.

---

## **Sample Login Credentials**

**Admin Account:**  
- **Username:** aryanarvi78@gmail.com  
- **Password:** 12345678  

**Employee Account:**  
- **Username:** aryanarvind@gmail.com 
- **Password:** 12345678 

> Use the above credentials to explore the portal functionality.

---

## **Project Overview**

The Faculty Attendance Management System (AMS) is designed to streamline attendance tracking for faculty members in colleges and universities. The system combines **face verification** with **geolocation tracking** to ensure accurate and secure attendance logging. It also supports role-based access for admins and employees.

### **Key Features**
- **Admin Panel**
  - View all faculty attendance records
  - Approve or reject attendance corrections
  - Manage faculty accounts and roles
- **Employee Panel**
  - Mark attendance using face verification
  - Track login/logout timings
  - Receive notifications for attendance status
- **Face Verification**
  - Uses **CompreFace API** for secure facial authentication
- **Location Tracking**
  - Ensures attendance is marked only from authorized campus locations

---

## **Tech Stack**
- **Frontend:** React.js  
- **Backend:** Firebase (Authentication + Firestore)  
- **Face Verification:** CompreFace API (TensorFlow.js based)  
- **Deployment:** Vercel  

---

AMS/
├─ public/
├─ scripts/
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ context/
│  ├─ firebase/
│  ├─ pages/
│  ├─ services/
│  └─ utils/
├─ App.jsx
├─ main.jsx
├─ .env
├─ package.json
└─ README.md


