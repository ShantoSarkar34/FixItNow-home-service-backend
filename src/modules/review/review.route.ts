import { Router } from 'express';
import { ReviewController } from './review.controller.js';
import auth from '../../middlewares/auth.js';

const router = Router();

router.post('/', auth('CUSTOMER'), ReviewController.createReview);
router.get('/', ReviewController.getReviews);
router.get('/:id', ReviewController.getReviewById);

export const ReviewRoutes = router;