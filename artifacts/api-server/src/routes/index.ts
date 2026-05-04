import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketRouter from "./market";
import socialRouter from "./social";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/market", marketRouter);
router.use("/social", socialRouter);
router.use("/admin", adminRouter);

export default router;
