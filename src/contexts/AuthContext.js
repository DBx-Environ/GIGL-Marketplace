// src/contexts/AuthContext.js - CLEAN VERSION - WELCOME EMAIL REMOVED
import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';


const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to load user data from Firestore
  const loadUserData = async (uid) => {
    try {
      console.log('Loading user data for UID:', uid);
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('User data loaded:', data);
        setUserData(data);
        return data;
      } else {
        console.log('No user document found in Firestore');
        setUserData(null);
        return null;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserData(null);
      return null;
    }
  };

  async function register(email, password, firstName, lastName) {
    try {
      console.log('Registering user:', email);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, {
        displayName: `${firstName} ${lastName}`
      });

      // Create user document in Firestore
      const userData = {
        email: user.email,
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`,
        emailVerified: false,
        isAdmin: false,
        createdAt: serverTimestamp(),
        registrationDate: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('User document created in Firestore');

      // Send email verification
      await sendEmailVerification(user);
      console.log('Verification email sent');
      
      return user;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async function login(email, password) {
    try {
      console.log('Logging in user:', email);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Force refresh of user data from server
      await user.reload();

      // Check if email is verified
      if (!user.emailVerified) {
        await signOut(auth);
        throw new Error('Please verify your email address before logging in. Check your inbox for a verification email.');
      }

      console.log('Login successful for verified user');
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserData(null);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  useEffect(() => {
    console.log('AuthContext useEffect starting...');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? user.uid : 'null');
      
      if (user) {
        try {
          // Force refresh user data from server
          await user.reload();
          
          // Only proceed if email is verified
          if (user.emailVerified) {
            console.log('User is verified, loading Firestore data...');
            
            // Load user data from Firestore
            const userData = await loadUserData(user.uid);
            
            if (userData) {
              // Sync email verification status in Firestore if needed
              if (!userData.emailVerified) {
                console.log('Syncing email verification status to Firestore...');
                await updateDoc(doc(db, 'users', user.uid), {
                  emailVerified: true,
                  emailVerifiedAt: serverTimestamp()
                });
                
                // Update local userData
                setUserData(prevData => ({
                  ...prevData,
                  emailVerified: true
                }));
              }
              
              // Set current user
              setCurrentUser(user);
              console.log('User authenticated and data loaded successfully');
            } else {
              console.log('No user data found in Firestore');
              setCurrentUser(null);
            }
          } else {
            console.log('User email not verified');
            setCurrentUser(null);
            setUserData(null);
          }
        } catch (error) {
          console.error('Error in auth state change:', error);
          setCurrentUser(null);
          setUserData(null);
        }
      } else {
        console.log('No user signed in');
        setCurrentUser(null);
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    register,
    login,
    logout,
    loading
  };

  console.log('AuthContext providing values:', {
    currentUser: currentUser?.uid || null,
    userData: userData?.firstName || null,
    loading
  });

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}