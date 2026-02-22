import { useEffect, useState } from "react";
import { createJob } from "../api/jobApi";
import { notify } from "../utils/notify";

const CreateJob = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    // Fetch technicians to populate dropdown
    const fetchTechs = async () => {
      try {
        const response = await fetch("/api/users?role=technician");
        const data = await response.json();
        setTechnicians(data);
      } catch (error) {
        console.error("Error fetching technicians:", error);
        setTechnicians([]); // Set to empty array on error
      }
    };
    fetchTechs();
  }, []);

  const handleSubmit = async (e) => {
    // Prevent default form submission behavior
    e.preventDefault();    
    // Call API to create job
    await createJob({ title, description, assignedTo: assignedTo || null, });

    // Clear form after submission
    setTitle("");
    setDescription("");
    setAssignedTo("");
    notify.success("Job created successfully!");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Create New Job</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input className="border p-2 w-full" placeholder="Title" value={title}  onChange={(e) => setTitle(e.target.value)} required/>
        <textarea className="border p-2 w-full" placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <select className="border p-2 w-full" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
          <option value="">Select Technician</option>
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>{tech.id}</option>
          ))}
        </select>
        <button type="submit" className="bg-blue-500 text-white py-2 px-4 rounded">
          Create Job
        </button>
      </form>
    </div>
  );
};

export default CreateJob;