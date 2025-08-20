import React, { useState } from "react";
import axios from "axios";

interface AuthFormProps {
  onAuthSuccess?: () => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        const res = await axios.post("http://localhost:4000/api/auth/login", { email, password });
  localStorage.setItem("token", res.data.token);
  alert("Login successful!");
  if (onAuthSuccess) onAuthSuccess();
      } else {
        const res = await axios.post("http://localhost:4000/api/auth/register", { name, email, password });
        alert("Registration successful! Please login.");
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Error occurred");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">{isLogin ? "Login" : "Register"}</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {!isLogin && (
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={e => setName(e.target.value)}
            className="border p-2 rounded"
            required
          />
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button type="submit" className="bg-blue-600 text-white py-2 rounded">
          {isLogin ? "Login" : "Register"}
        </button>
      </form>
      <button
        className="mt-4 text-blue-600 underline"
        onClick={() => setIsLogin(!isLogin)}
      >
        {isLogin ? "Need an account? Register" : "Already have an account? Login"}
      </button>
    </div>
  );
};

export default AuthForm;
