import { Router } from "express";
import { signup, login, me, updateProfile } from "../controllers/authController.js";
import { requireDirector } from "../middleware/auth.js";
import { signupRules, loginRules } from "../validators/index.js";

const router = Router();

router.post("/signup", signupRules, signup);
router.post("/login", loginRules, login);
router.get("/me", requireDirector, me);
router.put("/me", requireDirector, updateProfile);

export default router;
