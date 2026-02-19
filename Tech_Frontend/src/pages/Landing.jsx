import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

const Landing = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          TechSchedule
        </h1>

        <p className="text-lg text-gray-600 mb-8">
          Automotive service scheduling system for managing repair orders, technicians, and daily shop workflow.
        </p>

        {user ? (
          <Link to={user.role === "admin" ? "/admin" : "/technician"} className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition">
            Go to Dashboard
          </Link>
        ) : (
          <Link to="/login" className="bg-blue-600 text-white px-6 py-3 rounded hover:bg-blue-700 transition">
            Login
          </Link>
        )}
      </div>
    </div>
  );
};

export default Landing;