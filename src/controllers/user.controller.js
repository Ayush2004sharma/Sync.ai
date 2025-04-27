import userModel from "../models/user.model.js";
import * as createUser from "../services/user.service.js";
import { validationResult } from "express-validator";
import redisClient from "../services/redis.service.js";
export const createUserController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    
    const user = await createUser.createUser(req.body);
    
    const token = await user.generateJwt();
    const sanitizedUser = { ...user.toObject(), password: undefined };

    res.status(201).json({ user: sanitizedUser, token });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
export const loginUserController = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.isValidPassword(password); // ✅ Fix function name
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = await user.generateJwt();
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const profileUserController = async (req, res) => {
  console.log(req.user);
  res.status(200).json({ user: req.user });
};

export const logoutController = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization.split(" ")[1];
    redisClient.set(token, "logout", "EX", 60 * 60 * 24);
    res.status(200).json({
      message: "logged out successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(400).send(error.message);
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const loggedInUser = await userModel.findOne({ email: req.user.email });
    if (!loggedInUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const allUsers = await createUser.getAllUsers({ userId: loggedInUser._id });

    return res.status(200).json({ users: allUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

