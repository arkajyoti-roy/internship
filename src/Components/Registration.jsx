import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { setDoc, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaEye, FaEyeSlash, FaFileAlt, FaFolder, FaFolderOpen } from "react-icons/fa";

import "./Dis.css";
// import Google from "./Google";

const Registration = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });
  
  const navigate = useNavigate();

  // Password strength checker
  useEffect(() => {
    if (password) {
      let strength = 0;
      
      if (password.length >= 8) {
        strength += 25;
      }
      
      if (password.match(/[A-Z]/)) {
        strength += 25;
      }
      
      if (password.match(/[0-9]/)) {
        strength += 25;
      }
      
      if (password.match(/[^A-Za-z0-9]/)) {
        strength += 25;
      }
      
      setPasswordStrength(strength);
      
      if (strength <= 25) {
        setPasswordFeedback("Weak password");
      } else if (strength <= 50) {
        setPasswordFeedback("Fair password");
      } else if (strength <= 75) {
        setPasswordFeedback("Good password");
      } else {
        setPasswordFeedback("Strong password");
      }
    } else {
      setPasswordStrength(0);
      setPasswordFeedback("");
    }
  }, [password]);

  // Form validation
  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: "", email: "", password: "", phone: "" };
    
    // Name validation
    if (!name.trim()) {
      newErrors.name = "Please enter your full name";
      isValid = false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = "Please enter a valid email address";
      isValid = false;
    }
    
    // Password validation
    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    }
    
    // Phone validation
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phone.replace(/\D/g, ''))) {
      newErrors.phone = "Please enter a valid phone number";
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };

  const register = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      
      if (user) {
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          name: name,
          phone: phone,
          createdAt: new Date(),
        });
      }
      
      toast.success("Registration successful! Redirecting to login...", {
        position: "top-right",
      });
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
      
    } catch (error) {
      console.log(error.message);
      toast.error(
        error.message.includes("auth/email-already-in-use")
          ? "Email is already in use. Please try another email address."
          : error.message,
        {
          position: "top-right",
        }
      );
    } finally {
      setLoading(false);
    }
  };

  // Background shape animations
  const backgroundShapes = Array(12).fill().map((_, index) => (
    <div 
      key={index}
      className="absolute pointer-events-none" 
      style={{
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        opacity: 0.07,
        transform: `scale(${Math.random() * 0.5 + 0.5})`,
        animation: `float ${Math.random() * 10 + 20}s infinite ease-in-out`,
        animationDelay: `${Math.random() * 5}s`
      }}
    >
      {index % 3 === 0 ? (
        <FaFileAlt size={60} className="text-indigo-600" />
      ) : index % 3 === 1 ? (
        <FaFolder size={70} className="text-blue-600" />
      ) : (
        <FaFolderOpen size={65} className="text-indigo-400" />
      )}
    </div>
  ));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Shapes */}
      {backgroundShapes}
      
      {/* Abstract Waves */}
      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 transform -skew-y-3"></div>
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 transform skew-y-3"></div>
      
      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <div className="bg-indigo-600 p-3 rounded-full shadow-lg">
              <FaFileAlt className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-indigo-600">Document Manager</h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Store, organize, and access your documents securely
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-lg shadow-lg relative">
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
            <div className="bg-indigo-100 rotate-45 transform origin-bottom-left w-28 h-28 -translate-y-14 translate-x-14"></div>
          </div>
          <div className="absolute top-0 right-0 p-2">
            <FaFolder className="h-5 w-5 text-indigo-600" />
          </div>
          
          <form onSubmit={register} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  type="text"
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10`}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5 text-gray-500" />
                  ) : (
                    <FaEye className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>
              
              {password && (
                <>
                  <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${passwordStrength}%`,
                        backgroundColor:
                          passwordStrength <= 25
                            ? '#f44336'
                            : passwordStrength <= 50
                            ? '#ff9800'
                            : passwordStrength <= 75
                            ? '#2196f3'
                            : '#4caf50',
                      }}
                    ></div>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{passwordFeedback}</p>
                </>
              )}
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone Number
              </label>
              <div className="mt-1">
                <input
                  id="phone"
                  type="tel"
                  className={`appearance-none block w-full px-3 py-2 border ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm`}
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
              >
                {loading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>
            
            <div className="mt-6">
              {/* <Google /> */}
              {/* Uncomment when Google component is ready */}
            </div>
          </div>
          
          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200">
              Login
            </Link>
          </p>
        </div>
        
        {/* Document Manager Features */}
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="px-2 py-3 bg-white/80 backdrop-blur-sm rounded-lg shadow">
            <div className="flex justify-center">
              <FaFileAlt className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-1 text-xs font-medium text-gray-700">Store Documents</p>
          </div>
          <div className="px-2 py-3 bg-white/80 backdrop-blur-sm rounded-lg shadow">
            <div className="flex justify-center">
              <FaFolder className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-1 text-xs font-medium text-gray-700">Organize Files</p>
          </div>
          <div className="px-2 py-3 bg-white/80 backdrop-blur-sm rounded-lg shadow">
            <div className="flex justify-center">
              <FaFolderOpen className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-1 text-xs font-medium text-gray-700">Secure Access</p>
          </div>
        </div>
      </div>
      
      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Registration;