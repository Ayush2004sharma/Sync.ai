"use client";

import { useState, useEffect } from "react";
import axiosInstance from "./config/axios";
import { useRouter } from "next/navigation";

export default function Home() {
  const [isModelOpen, setModelOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [project, setProject] = useState([]);

  const router = useRouter();

  const fetchProjects = () => {
    axiosInstance
      .get("/projects/all")
      .then((res) => setProject(res.data.projects))
      .catch((err) => console.log(err));
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  function createProject(e) {
    e.preventDefault();

    axiosInstance
      .post("/projects/create", {
        name: projectName,
      })
      .then(() => {
        setModelOpen(false);
        setProjectName("");
        fetchProjects(); // Refresh project list
      })
      .catch((err) => {
        console.log(err);
      });
  }

  return (
    <main className="p-4">
      <div className="projects flex flex-wrap gap-4">
        <button
          className="project border p-4 border-slate-300 rounded-lg"
          onClick={() => setModelOpen(true)}
        >
          New Project <i className="ml-2 ri-link"></i>
        </button>

        {project.map((project) => (
          <div
            key={project._id}
            onClick={() => {
              router.push(`/project/${project._id}`);

            }}
            className="project flex flex-col gap-2 cursor-pointer p-4 border border-slate-300 rounded-md min-w-52 hover:bg-slate-200"
          >
            <h2 className="font-semibold">{project.name}</h2>
            <div className="flex gap-2">
              <p>
                <small>
                  <i className="ri-user-line"></i> Collaborators
                </small>
                :
              </p>
              {project.users.length}
            </div>
          </div>
        ))}
      </div>

      {isModelOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Create Project</h2>
            <form onSubmit={createProject}>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Project Name
              </label>
              <input
                onChange={(e) => setProjectName(e.target.value)}
                value={projectName}
                type="text"
                className="w-full p-2 border border-gray-300 rounded-lg mb-4"
                placeholder="Enter project name"
                required
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                  onClick={() => setModelOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
