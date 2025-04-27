import { Router } from "express";
import { body } from "express-validator";
import * as projectController from "../controllers/project.controller.js";
import * as authMiddleWare from "../middleware/auth.middleware.js";
const router = Router();
router.post(
  "/create",
  authMiddleWare.authUser,
  body("name").isString().withMessage("Name is required"),
  projectController.createProject
);

router.get("/all", authMiddleWare.authUser, projectController.getAllProjects);
export default router;

router.put(
  '/add-user',
  authMiddleWare.authUser,
  body('projectId').isString().withMessage("Project ID is required"),
  body('users')
    .isArray({ min: 1 })
    .withMessage("User must be an array")
    .bail()
    .custom(users => {
      if (!users.every(user => typeof user === 'string')) {
        throw new Error("User must be an array of strings");
      }
      return true;
    }),
  projectController.addUserToProject
);


router.get('/get-project/:projectId',authMiddleWare.authUser,
  projectController.getProjectById
)

