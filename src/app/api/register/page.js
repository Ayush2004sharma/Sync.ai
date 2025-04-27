"use client";
import { useEffect, useRef, useState, useContext } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import { useRouter } from "next/navigation"; 
import axiosInstance from "@/app/config/axios";
import { UserContext } from "@/app/context/user.context";

const Register = () => {
  const formRef = useRef(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUser } = useContext(UserContext);

  // Safe localStorage access
  const safeLocalStorage = {
    setItem: (key, value) => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(key, value);
        }
      } catch (e) {
        console.error("LocalStorage access error:", e);
      }
    }
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.post("/users/register", { 
        email, 
        password 
      });

      // Handle different response formats
      const token = response.data?.token || response.data?.data?.token;
      const userData = response.data?.user || response.data?.data?.user || response.data;

      if (!token) {
        throw new Error("Authentication token not received");
      }

      safeLocalStorage.setItem('token', token);
      setUser(userData);
      
      // Ensure state updates complete before navigation
      setTimeout(() => router.push("/"), 100);
      
    } catch (err) {
      console.error("Registration error:", err);
      const errorMessage = err.response?.data?.message || 
                         err.response?.data?.error || 
                         err.message || 
                         "Registration failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    gsap.fromTo(
      formRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1.2, ease: "power3.out" }
    );
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-4">
      <div
        ref={formRef}
        className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-200 transition-all duration-300"
        style={{
          boxShadow: "0px 0px 20px rgba(0, 100, 255, 0.2)",
        }}
      >
        <h2 className="text-3xl font-semibold text-center mb-6 text-gray-900 font-[Inter]">
          Create an Account
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submitHandler}>
          <div className="mb-5">
            <label className="block text-gray-700 font-medium">Email</label>
            <input
              onChange={(e) => setEmail(e.target.value)}
              value={email}
              type="email"
              required
              className="w-full px-4 py-3 mt-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-[Inter]"
              placeholder="Enter your email"
            />
          </div>
          <div className="mb-5">
            <label className="block text-gray-700 font-medium">Password</label>
            <input
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              type="password"
              required
              minLength="6"
              className="w-full px-4 py-3 mt-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-[Inter]"
              placeholder="Create a password (min 6 characters)"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 mt-5 text-lg font-medium text-white rounded-lg transition-all duration-300 font-[Inter] ${
              loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : "Sign Up"}
          </button>
        </form>
        <p className="text-gray-600 text-center mt-4 text-sm font-light">
          Already have an account?{" "}
          <Link href="/pages/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;