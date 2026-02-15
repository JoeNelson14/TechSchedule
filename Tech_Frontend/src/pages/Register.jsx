import { useState } from "react";
import { register } from "../api/auth";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("technician");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await register(email, password, role);
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-96">
        <h2 className="text-xl font-bold mb-4">Register</h2>
        <input className="w-full mb-3 p-2 border rounded" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full mb-3 p-2 border rounded" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <select className="w-full mb-3 p-2 border rounded" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="technician">Technician</option>
        </select>
        <button className="w-full bg-green-600 text-white p-2 rounded" type="submit">Register</button>
        <button className="w-full bg-blue-700 text-white p-2 mt-3 rounded" type='button' onClick={() => navigate("/login")}>Back to Login</button>
      </form>
    </div>
  );
};

export default Register;