# Admin Panel Setup Guide

This guide explains how to set up the admin account for the Attendance Management System.

## Initial Admin Setup

For security reasons, users cannot register themselves. Only admins can create new user accounts. To create the first admin account, follow these steps:

### Step 1: Create a Regular User Account

First, you need to create a regular user account:

1. Create a user through the Firebase Console (Authentication section)
2. Fill in the user details in the Firestore database under the 'teachers' collection

### Step 2: Make the User an Admin

Use the provided script to make the user an admin:

1. Open the `scripts/make-admin.js` file
2. Update the Firebase configuration with your project's values
3. Run the script with the user's email:

```bash
node scripts/make-admin.js user@example.com
```

This will update the user in Firestore with `isAdmin: true`.

## Admin Features

Once you've created an admin account, you can log in to access the admin panel. The admin panel provides the following features:

1. **Attendance Reports**: View attendance data for all employees
   - Filter by date range
   - Filter by department
   - Search by name/ID
   - View detailed attendance stats for individual employees

2. **User Management**: Manage all employees in the system
   - View all employees
   - Filter by department
   - Search by name/ID/email
   - View employee details

3. **Employee Registration**: Create new employee accounts
   - Register new employees with all required details
   - The employee will need to complete face registration on first login

4. **Attendance Warnings**: Send warnings to employees with poor attendance
   - Select severity level (low, medium, high)
   - Include detailed description
   - Warning is recorded in the employee's profile

## Security Notes

- Only users with `isAdmin: true` in their Firestore document can access the admin panel
- Admin routes are protected with the `AdminRoute` component
- Regular users cannot access admin features
- Only admins can create new user accounts

## Customization

You can customize the admin panel by modifying the following files:

- `src/components/Admin.jsx`: Main admin panel UI
- `src/components/EmployeeRegistration.jsx`: Employee registration form
- `src/firebase/adminService.js`: Admin-specific Firebase functions 