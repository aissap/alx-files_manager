import { Router } from 'express';
import AppController from '../controllers/AppController';

const router = Router();

router.post('/users', UsersController.postNew);

export default router;