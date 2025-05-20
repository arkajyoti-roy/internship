import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import "./Dis.css";
import {
  FaFileAlt,
  FaFolder,
  FaFolderOpen,
  FaLock,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
// import Google from "./Google";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const request = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password", {
        position: "top-right",
      });
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      try {
        const response = await axios.post("/api/login", { email, password });
        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      } catch (error) {
        console.error("Login failed", error);
      }

      console.log("Success");
      toast.success("Login Successful! Redirecting to dashboard...", {
        position: "top-right",
      });
      setTimeout(() => {
        navigate("/display");
      }, 1000);
    } catch (error) {
      console.log(error.message);
      let errorMessage = "Login failed. Please check your credentials.";

      if (error.message.includes("auth/user-not-found")) {
        errorMessage =
          "No account found with this email. Please check your email or sign up.";
      } else if (error.message.includes("auth/wrong-password")) {
        errorMessage = "Incorrect password. Please try again.";
      } else if (error.message.includes("auth/invalid-email")) {
        errorMessage = "Invalid email format. Please enter a valid email.";
      }

      toast.error(errorMessage, {
        position: "top-right",
      });
    } finally {
      setLoading(false);
    }
  };

  const backgroundShapes = Array(10)
    .fill()
    .map((_, index) => (
      <div
        key={index}
        className="absolute pointer-events-none"
        style={{
          top: `${Math.random() * 100}%`,
          left: `${Math.random() * 100}%`,
          opacity: 0.07,
          transform: `scale(${Math.random() * 0.5 + 0.5})`,
          animation: `float ${Math.random() * 10 + 20}s infinite ease-in-out`,
          animationDelay: `${Math.random() * 5}s`,
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
      {backgroundShapes}

      <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 transform -skew-y-3"></div>
      <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 transform skew-y-3"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        <div className="text-center">
          <div className="flex items-center justify-center">
            <div className="bg-indigo-600 p-3 rounded-full shadow-lg">
              <FaFileAlt className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-indigo-600">
            Document Manager
          </h1>
          <h2 className="mt-2 text-xl font-bold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">
            Log in to access your documents
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow-lg relative">
          {/* Decorative Corner */}
          <div className="absolute top-0 right-0 w-20 h-20 overflow-hidden">
            <div className="bg-indigo-100 rotate-45 transform origin-bottom-left w-28 h-28 -translate-y-14 translate-x-14"></div>
          </div>
          <div className="absolute top-0 right-0 p-2">
            <FaLock className="h-5 w-5 text-indigo-600" />
          </div>

          <form onSubmit={request} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember"
                  name="remember"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="remember"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a
                  href="#"
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
              >
                {loading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  "Sign In"
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
                <span className="px-2 bg-white text-gray-500">
                  Or continue with
                </span>
              </div>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{" "}
            <Link
              to="/registration"
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-200"
            >
              Sign up now
            </Link>
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="px-2 py-3 bg-white/80 backdrop-blur-sm rounded-lg shadow">
            <div className="flex justify-center">
              <FaFileAlt className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-1 text-xs font-medium text-gray-700">
              Store Documents
            </p>
          </div>
          <div className="px-2 py-3 bg-white/80 backdrop-blur-sm rounded-lg shadow">
            <div className="flex justify-center">
              <FaFolder className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-1 text-xs font-medium text-gray-700">
              Organize Files
            </p>
          </div>
          <div className="px-2 py-3 bg-white/80 backdrop-blur-sm rounded-lg shadow">
            <div className="flex justify-center">
              <FaFolderOpen className="h-5 w-5 text-indigo-500" />
            </div>
            <p className="mt-1 text-xs font-medium text-gray-700">
              Secure Access
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%,
          100% {
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

export default Login;
