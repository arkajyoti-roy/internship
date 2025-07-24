import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
} from "firebase/auth";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { setDoc, doc, getDoc } from "firebase/firestore";
import "./Dis.css";
import {
  FaFileAlt,
  FaFolder,
  FaFolderOpen,
  FaLock,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaGoogle,
  FaGithub,
} from "react-icons/fa";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
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
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Check if user exists and their auth provider
      const userDoc = await getDoc(doc(db, "Users", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();

        // Check if this is a Google-only user trying to login with email/password
        if (userData.authProvider === "google-only") {
          // Sign out the user and show error
          await auth.signOut();
          toast.error(
            "This account was created with Google. Please use 'Continue with Google' to sign in.",
            {
              position: "top-right",
            }
          );
          setLoading(false);
          return;
        }
      }

      try {
        const response = await axios.post("/api/login", { email, password });
        setUser(response.data);
        localStorage.setItem("user", JSON.stringify(response.data));
      } catch (error) {
        console.error("Login failed", error);
      }

      console.log("Success");
      toast.success("Login Successful!", {
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

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, "Users", user.uid));

        if (!userDoc.exists()) {
          // User doesn't exist - they need to register first
          await auth.signOut();
          toast.error(
            "No account found with this Google account. Please sign up first.",
            {
              position: "top-right",
            }
          );
          setGoogleLoading(false);
          return;
        }

        const userData = userDoc.data();

        // Both email-password and google-only users can login with Google
        // No restriction needed here since Google login should work for both types

        // Try to sync with your backend API if needed
        try {
          const response = await axios.post("/api/login", {
            email: user.email,
            googleAuth: true,
          });
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));
        } catch (error) {
          console.error("Backend sync failed", error);
          // Continue even if backend sync fails
        }

        toast.success("Login Successful!", {
          position: "top-right",
        });

        setTimeout(() => {
          navigate("/display");
        }, 1000);
      }
    } catch (error) {
      console.log(error.message);
      toast.error(
        error.message.includes("auth/popup-closed-by-user")
          ? "Sign-in cancelled by user"
          : "Failed to sign in with Google. Please try again.",
        {
          position: "top-right",
        }
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const signInWithGitHub = async () => {
    setGithubLoading(true);
    const provider = new GithubAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        // Check if user exists in Firestore
        const userDoc = await getDoc(doc(db, "Users", user.uid));

        if (!userDoc.exists()) {
          // User doesn't exist - they need to register first
          await auth.signOut();
          toast.error(
            "No account found with this GitHub account. Please sign up first.",
            {
              position: "top-right",
            }
          );
          setGithubLoading(false);
          return;
        }

        const userData = userDoc.data();

        // Both email-password and github users can login with GitHub
        // No restriction needed here since GitHub login should work for both types

        // Try to sync with your backend API if needed
        try {
          const response = await axios.post("/api/login", {
            email: user.email,
            githubAuth: true,
          });
          setUser(response.data);
          localStorage.setItem("user", JSON.stringify(response.data));
        } catch (error) {
          console.error("Backend sync failed", error);
          // Continue even if backend sync fails
        }

        toast.success("Login Successful!", {
          position: "top-right",
        });

        setTimeout(() => {
          navigate("/display");
        }, 1000);
      }
    } catch (error) {
      console.log(error.message);
      toast.error(
        error.message.includes("auth/popup-closed-by-user")
          ? "Sign-in cancelled by user"
          : error.message.includes(
              "auth/account-exists-with-different-credential"
            )
          ? "An account already exists with the same email address but different sign-in credentials."
          : "Failed to sign in with GitHub. Please try again.",
        {
          position: "top-right",
        }
      );
    } finally {
      setGithubLoading(false);
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

            <div className="mt-6 space-y-3">
              <button
                onClick={signInWithGoogle}
                disabled={googleLoading}
                className="w-full flex justify-center items-center gap-3 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
              >
                {googleLoading ? (
                  <svg
                    className="animate-spin h-5 w-5 text-gray-600"
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
                  <>
                    <svg
                      viewBox="0 0 48 48"
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                    >
                      <path
                        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                        fill="#FFC107"
                      ></path>
                      <path
                        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                        fill="#FF3D00"
                      ></path>
                      <path
                        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                        fill="#4CAF50"
                      ></path>
                      <path
                        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                        fill="#1976D2"
                      ></path>
                    </svg>
                    Continue with Google
                  </>
                )}
              </button>

              <button
                onClick={signInWithGitHub}
                disabled={githubLoading}
                className="w-full flex justify-center items-center gap-3 py-2 px-4 border border-gray-800 rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-all duration-300"
              >
                {githubLoading ? (
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
                  <>
                    <FaGithub className="w-5 h-5" />
                    Continue with GitHub
                  </>
                )}
              </button>
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
