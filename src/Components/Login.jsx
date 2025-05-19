import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "./firebase";
import "./Dis.css";
// import Google from "./Google";

const Login = () => {
  const [email, setEmail] = useState();
  const [password, setPassword] = useState();
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  const request = async (e) => {
    e.preventDefault();
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
      toast.success("Login Successful!", {
        position: "top-right",
      });
      setTimeout(() => {
        navigate('/display');
      }, 1000);
    } catch (error) {
      console.log(error.message);
      toast.error(error.message, {
        position: "top-right",
      });
    }
  };

  return (
    <>
      <div className="logcen">
        <h1 className="hq">
          <>Document Manager</>
        </h1>
        <div className="w-80 rounded-lg shadow h-auto p-6 bg-white relative overflow-hidden ">
          <div className="flex flex-col justify-center items-start space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Login</h2>
            <p className="text-slate-500">Enter details below.</p>
          </div>
          <form onSubmit={request} className="w-full mt-4 space-y-3">
            <div>
              <input
                className="outline-none border-2 rounded-md px-2 py-1 text-slate-500 w-full focus:border-blue-300"
                placeholder="Email"
                id="username"
                name="username"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                className="outline-none border-2 rounded-md px-2 py-1 text-slate-500 w-full focus:border-blue-300"
                placeholder="Password"
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  className="mr-2 w-4 h-4"
                  id="remember"
                  name="remember"
                  type="checkbox"
                />
                <span className="text-slate-500">Remember me </span>
              </div>
              <a className="text-white font-medium hover:underline" href="#">
                Forgot Password
              </a>
            </div>
            <button
              className="w-full justify-center py-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-md text-white ring-2"
              id="login"
              name="login"
              type="submit"
            >
              login
            </button>
            <p className="flex justify-center space-x-1">
              <span className="text-slate-700"> Have an account? </span>
              <Link
                className="text-blue-500 hover:underline"
                to="/registration"
              >
                Sign Up
              </Link>
            </p>
          </form>
          {/* <Google/> */}
        </div>
      </div>
    </>
  );
};

export default Login;
