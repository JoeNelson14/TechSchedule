import { useEffect, useState } from "react";
import { getJobs, deleteJob } from "../api/jobApi";

const Jobs = () => {
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    };
    fetchJobs();
  }, []);

  const handleDelete = async (id) => {
    await deleteJob(id);
    const fetchJobs = async () => {
      try {
        const data = await getJobs();
        setJobs(data);
      } catch (error) {
        console.error("Error fetching jobs:", error);
      }
    };
    fetchJobs();
  };

  return (
    <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Jobs</h1>
        <button className="bg-green-500 text-white py-2 px-4 rounded mb-4" onClick={() => window.location.href = "/create-job"}>
          Create New Job
        </button>
        {jobs.map((job) => (
          <div key={job.id} className="border rounded p-4 mb-3 shadow">
            <h2 className="text-lg font-semibold">{job.title}</h2>
            <p>{job.description}</p>
            <p className="text-sm text-gray-500">Status: {job.status}</p>
            <button onClick={() => handleDelete(job.id)} className="bg-red-500 text-white py-1 px-3 rounded mt-2">
              Delete
            </button>
          </div>
        ))}
    </div>
  );
};

export default Jobs;