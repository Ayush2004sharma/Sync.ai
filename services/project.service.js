import mongoose from "mongoose";
import projectModel from "../models/project.model.js";

export const createProject = async ({ name, userId }) => {
  if (!name) {
    throw new Error("Name is required");
  }

  if (!userId) {
    throw new Error("User is required");
  }
  const project = await projectModel.create({
    name,
    users: [userId],
  });
  return project;
};

export const getAllProjectByUserId = async ({ userId }) => {
  if (!userId) {
    throw new Error("User is required");
  }
  const allUserProjects = await projectModel.find({ users: userId });
  return allUserProjects;
};

export const addUserToProject = async ({ projectId, users, userId }) => {
  if (!projectId) {
    throw new Error("Project Id is required");
  }
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw new Error("Invalid Project Id");
  }
  if (!users || users.length === 0) {
    throw new Error("User is required");
  }
  if (!userId) {
    throw new Error("User Id is required");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User Id");
  }
  if (!Array.isArray(users) || users.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new Error("Invalid User Id in users array");
  }

  const project = await projectModel.findOne({ _id: projectId, users: userId});
  if (!project) {
    throw new Error("Project not found or user is not part of the project");
  }

  const updatedProject = await projectModel.findOneAndUpdate(
    { _id: projectId },
    { $addToSet: { users: { $each: users } } },
    { new: true }
  );

  return updatedProject;
};


export const getProjectById= async({projectId})=>{
  if(!projectId){
    throw new Error("Project Id is required");
  }
  if(!mongoose.Types.ObjectId.isValid(projectId)){
    throw new Error("Invalid Project Id")
  }
  const project= await projectModel.findById({
    _id:projectId
  }).populate('users')
  console.log("heklo")
  return project
}