import { useState, useEffect } from "react";
import "./App.css";
import { Route, Routes, BrowserRouter, Navigate } from "react-router-dom";
import Registration from "./Components/Registration";
import Login from "./Components/Login";
import Display from "./Components/Display";
import { auth } from "./Components/firebase";
import Cookies from 'js-cookie';

function App() {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // First, check for Firebase auth state
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in with Firebase
        setUser(firebaseUser);
        
        // Set authentication cookie with Firebase UID for extra security
        Cookies.set('authUser', JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          lastLogin: new Date().toISOString()
        }), { 
          expires: 1/48, // 30 minutes
          secure: true,  // Only transmitted over HTTPS
          sameSite: 'Strict' // Protect against CSRF
        });
        
        setIsAuthenticated(true);
      } else {
        // User is signed out of Firebase
        setUser(null);
        Cookies.remove('authUser');
        setIsAuthenticated(false);
      }
    });

    // Then, check for existing cookie on load
    const authCookie = Cookies.get('authUser');
    if (authCookie) {
      try {
        const cookieData = JSON.parse(authCookie);
        // Verify if the cookie data matches current Firebase user
        auth.currentUser?.uid === cookieData.uid ? 
          setIsAuthenticated(true) : 
          Cookies.remove('authUser');
      } catch (error) {
        console.error('Invalid auth cookie:', error);
        Cookies.remove('authUser');
      }
    }

    return () => unsubscribe();
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated && user ? (
                <Navigate to="/display" />
              ) : (
                <Login />
              )
            }
          />
          <Route 
            path="/registration" 
            element={
              isAuthenticated && user ? (
                <Navigate to="/display" />
              ) : (
                <Registration />
              )
            }
          />
          <Route 
            path="/login" 
            element={
              isAuthenticated && user ? (
                <Navigate to="/display" />
              ) : (
                <Login />
              )
            }
          />
          <Route 
            path="/display" 
            element={
              isAuthenticated && user ? (
                <Display />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
