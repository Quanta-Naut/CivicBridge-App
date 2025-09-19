// Firebase configuration
// Replace with your actual Firebase config from Firebase Console
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDDRlfSYZYM78g8YH043O_7HWpbRl9AbB0",
  authDomain: "civicbridge-53f4d.firebaseapp.com",
  projectId: "civicbridge-53f4d",
  storageBucket: "civicbridge-53f4d.firebasestorage.app",
  messagingSenderId: "361669538037",
  appId: "1:361669538037:web:b40f8d370bb6e6e19955bc",
  measurementId: "G-0Q3ES1FZS3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app;