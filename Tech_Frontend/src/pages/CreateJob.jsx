import { useState } from "react";
import api from "../api/api";

const CreateJob = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    await api.post("/jobs", { title, description });
    alert("Job created successfully!");
  };

  return (
    <form onSubmit={handleSubmit}>
      <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <button type="submit">Create Job</button>
    </form>
  );
};

export default CreateJob;