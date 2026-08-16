import { Router } from "express";
import {
  checkUid,
  getUser,
  login,
  lookupPlayer,
  register,
  deleteUser,
  getUsers,
  verifyAdmin,
  verifyPartner,
  changeAdminPassword,
  changePartnerPassword,
  googleLogin,
  linkUid,
  updateProfileHandler,
  changePasswordHandler,
  uploadAvatarHandler,
} from "../controllers/authController.js";
import { requireAuth, requireAdmin, requireStaff } from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/google", googleLogin);
router.post("/link-uid", requireAuth, linkUid);
router.put("/profile", requireAuth, updateProfileHandler);
router.put("/password", requireAuth, changePasswordHandler);
router.post("/avatar", requireAuth, uploadAvatarHandler);
router.post("/verify-admin", verifyAdmin);
router.post("/verify-partner", verifyPartner);
router.post("/change-admin-password", requireAdmin, changeAdminPassword);
router.post("/change-partner-password", requireAdmin, changePartnerPassword);
router.get("/check-uid/:uid", checkUid);
router.get("/lookup-player/:uid", lookupPlayer);
router.get("/users", requireStaff, getUsers);
router.get("/users/:uid", requireAuth, getUser);
router.delete("/users/:uid", requireAdmin, deleteUser);

export default router;
