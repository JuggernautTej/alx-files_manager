/*eslint-disable*/
import { Router } from 'express';
import AppController from '../controllers/AppController.js';
import AuthController from '../controllers/AuthController.js';
import UsersController from '../controllers/UsersController.js';
import FilesController from '../controllers/FilesController.js';

const router = Router();

router.get('/status', AppController.getStatus);
router.get('/stats',  AppController.getStats);
router.get('/connect', AuthController.getConnect);
router.get('/disconnect', AuthController.getDisconnect);
router.get('/users/me', UsersController.getMe);
router.get('/files', FilesController.getIndex);
router.get('/files/:id', FilesController.getShow);

router.post('/files', FilesController.postUpload);
router.post('/users', UsersController.postNew);

module.exports = router;