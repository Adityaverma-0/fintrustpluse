import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import jobsRouter from "./jobs";
import proposalsRouter from "./proposals";
import projectsRouter from "./projects";
import walletRouter from "./wallet";
import notificationsRouter from "./notifications";
import reviewsRouter from "./reviews";
import messagesRouter from "./messages";
import freelancersRouter from "./freelancers";
import contractsRouter from "./contracts";
import submissionsRouter from "./submissions";
import activityRouter from "./activity";
import adminRouter from "./admin";
import escrowRouter from "./escrow";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(jobsRouter);
router.use(proposalsRouter);
router.use(projectsRouter);
router.use(walletRouter);
router.use(notificationsRouter);
router.use(reviewsRouter);
router.use(messagesRouter);
router.use(freelancersRouter);
router.use(contractsRouter);
router.use(submissionsRouter);
router.use(activityRouter);
router.use(adminRouter);
router.use(escrowRouter);

export default router;
