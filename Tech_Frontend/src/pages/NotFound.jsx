import { Link } from "react-router-dom";

// Simple fallback page for unknown routes so users always have a recovery path.
const NotFound = () => {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="modern-card p-8 text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-slate-800">404</h1>
        <p className="mt-2 text-slate-600">The page you are looking for does not exist.</p>
        <Link
          to="/"
          className="inline-block mt-5 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700"
        >
          Go to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
