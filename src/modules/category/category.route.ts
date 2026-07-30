import { Router } from 'express';
import { CategoryController } from './category.controller.js';
import auth from '../../middlewares/auth.js';

// Public: GET /api/categories
const router = Router();
router.get('/', CategoryController.getAllCategories);
export const CategoryRoutes = router;

// Admin: GET/POST /api/admin/categories
const adminRouter = Router();
adminRouter.get('/', auth('ADMIN'), CategoryController.getAllCategories);
adminRouter.post('/', auth('ADMIN'), CategoryController.createCategory);
adminRouter.get('/:id', auth('ADMIN'), CategoryController.getSingleCategory);
adminRouter.put('/:id', auth('ADMIN'), CategoryController.updateCategory);
adminRouter.delete('/:id', auth('ADMIN'), CategoryController.deleteCategory);
export const CategoryAdminRoutes = adminRouter;