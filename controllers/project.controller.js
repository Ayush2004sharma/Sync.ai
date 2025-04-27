import * as projectService from "../services/project.service.js";
import { validationResult } from "express-validator";
import userModel from "../models/user.model.js";
export const createProject = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name } = req.body;
    const loggedInUserId = await userModel.findOne({ email: req.user.email });
    const userId = loggedInUserId._id;

    const newProject = await projectService.createProject({ name, userId });
    res.status(201).json(newProject)
  } catch (error) {
    res.status(400).send(error.message);
  }
};


export const getAllProjects= async(req, res)=>{
  try {
    
    const loggedInUserId= await userModel.findOne({email:req.user.email});
    const allUserProjects= await projectService.getAllProjectByUserId({userId:loggedInUserId._id});
    return res.status(200).json({projects:allUserProjects})
  } catch (error) {
    console.log(error);
    res.status(400).json({error:error.message})
  }
} 

export const addUserToProject= async(req,res)=>{
  const errors= validationResult(req);
  if(!errors.isEmpty()){
    return res.status(400).json({errors:errors.array()});
  }
  try {
    const {projectId,users}=req.body;
    const loggedInUserId= await userModel.findOne({email:req.user.email})
    
    const project =await projectService.addUserToProject({
      projectId,
      users,
      userId:loggedInUserId._id
    })
    return res.status(200).json({project})
  } catch (error) {
    console.log(error);
    res.status(400).json({error:error.message})
    
  }
}

export const getProjectById= async(req,res)=>{
  const{projectId}=req.params;
  try {
    const project =await projectService.getProjectById({projectId});

    return res.status(200).json({project});
  } catch (error) {
    console.log(error)
    res.status(400).json({error:error.message})
  }
}
