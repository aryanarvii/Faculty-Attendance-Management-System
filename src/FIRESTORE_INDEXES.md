# Firebase Indexes Guide

## Required Indexes

To fix the error with leave queries, you need to create the following composite index in Firebase:

1. Collection: `leaves`
   - Query scope: `Collection`
   - Fields:
     - `userId` (Ascending)
     - `appliedAt` (Descending)

## How to Create Indexes

1. **Using the Firebase Console**:
   - Go to the Firebase Console: https://console.firebase.google.com/
   - Select your project (`attendance-management-sys-2`)
   - In the left sidebar, navigate to "Firestore Database"
   - Click on the "Indexes" tab
   - Click "Add Index"
   - Collection ID: `leaves`
   - Query scope: Select `Collection` (not "Collection group")
   - Fields:
     - Field path: `userId`, Order: `Ascending`
     - Field path: `appliedAt`, Order: `Descending`
   - Click "Create"

2. **Using the URL from the error message**:
   - Simply click on the URL provided in the error message. It will take you directly to the Firebase console with the required index pre-filled.
   - Make sure "Collection" is selected as the query scope (this should be pre-selected)
   - Review the details and click "Create Index"

## After Creating the Index

- It may take a few minutes for the index to be created and deployed
- Once the index is active, you can re-enable the `orderBy` clauses in the code
- To re-enable, open `src/firebase/leaveService.js` and restore the original queries:

```javascript
// For getUserLeaves
const q = query(
  leavesRef,
  where('userId', '==', userId),
  orderBy('appliedAt', 'desc')
);

// For getAllLeaves
const q = query(
  leavesRef,
  orderBy('appliedAt', 'desc')
);
```

## Why Indexes Are Needed

Firebase Firestore requires composite indexes for queries that:
1. Filter on one field AND sort on a different field
2. Use multiple `orderBy` clauses
3. Combine `where` filters with `orderBy` on different fields

These indexes help Firestore maintain high performance for complex queries. 