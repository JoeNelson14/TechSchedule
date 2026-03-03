import { useEffect, useState } from "react";
import { login } from "../api/auth";
import { notify } from "../utils/notify";
import { useAuth } from "../auth/useAuth";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { loginUser, user } = useAuth();
  const navigate = useNavigate();


  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else if (user.role === "technician") {
        navigate("/technician");
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      if (!data?.access_token) {
        notify.error("Login response did not include an access token.");
        return;
      }
      loginUser(data.access_token);
    } catch (error) {
      const msg = error?.response?.data?.detail || "Login failed. Please verify API URL and credentials.";
      notify.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-96">
        <h2 className="text-xl font-bold mb-4">Login</h2>
        <input className="w-full mb-3 p-2 border rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full mb-3 p-2 border rounded" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full bg-blue-600 text-white p-2 rounded" type="submit">Login</button>
        <button className="w-full bg-green-700 text-white p-2 mt-3 rounded" type='button' onClick={() => navigate("/register")}>Register</button>
      </form>
    </div>
  );
};

export default Login;