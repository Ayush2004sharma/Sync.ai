"use client";
import { useState, useContext, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axiosInstance from "@/app/config/axios";
import { UserContext } from "@/app/context/user.context";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useContext(UserContext);
  const router = useRouter();

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const submitHandler = useCallback(
    async (e) => {
      e.preventDefault();
      setIsLoading(true);
      setError("");

      try {
        const res = await axiosInstance.post("/users/login", {
          email: formData.email,
          password: formData.password,
        });

        if (!res?.data) {
          throw new Error("Invalid response from server");
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("token", res.data.token);
        }

        setUser(res.data);
        router.push("/");
      } catch (err) {
        console.error("Login error:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Login failed. Please try again."
        );
      } finally {
        setIsLoading(false);
        console.log("Form submitted:", formData);
      }
    },
    [formData, setUser, router]
  );

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
        <h2 className="text-3xl font-semibold text-center mb-6 text-gray-900 font-[Inter]">
          Welcome Back
        </h2>
        <p className="text-gray-600 text-center mb-6 font-light">
          Login to continue
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submitHandler}>
          <div className="mb-5">
            <label htmlFor="email" className="block text-gray-700 font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 mt-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-[Inter]"
              placeholder="Enter your email"
            />
          </div>

          <div className="mb-5">
            <label
              htmlFor="password"
              className="block text-gray-700 font-medium"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-3 mt-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-[Inter]"
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 mt-5 text-lg font-medium text-white rounded-lg transition-all duration-300 font-[Inter] ${
              isLoading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-light">
            Don't have an account?{" "}
            <Link
              href="/api/register"
              className="text-blue-600 hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>
          <p className="mt-2">
            <Link
              href="/forgot-password"
              className="text-blue-600 hover:underline font-light"
            >
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;