import { useAuth } from './auth/useAuth.js';

function App() {
  const { user, loading, isAuthenticated, isAdmin } = useAuth();

  if  (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className='min-h-screen p-6 bg-gray-100'>
      <h1 className='text-2xl font-bold mb-4'>TechSchedule Auth Debug</h1>

      {isAuthenticated ? (
        <div className='space-y-2'>
          <p><strong>Email</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.role}</p>
          <p><strong>Is Admin:</strong> {isAdmin ? 'Yes' : 'No'}</p>
        </div>
      ) : (
        <p>User is not authenticated.</p>
      )}
    </div>
  );
}

export default App;