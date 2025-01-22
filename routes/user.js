import express from 'express';
import { requestOtp, verifyOtp, testVerifyOtp, completeBasic, update, completeRegistration, getProfile, uploadImage, uploadImages, filterUsersWithProjectsOrProducts, flagUser, clearUserFlags, deleteAccount, blockUser, unblockUser } from '../controllers/user.js';
import upload from '../config/multerConfig.js';
import { protect } from '../middlewares/protect.js';
import { createSubscription, verifySubscription } from '../controllers/order.js';
import { getPlans } from '../controllers/subcriptionPlan.js';

const router = express.Router();

const conditionalProtect = (req, res, next) => {
  if (req.query.user === 'guest') {
    return next(); // Skip protect middleware if user=guest
  }
  return protect(req, res, next); // Apply protect middleware otherwise
};

router.post('/request-otp', requestOtp);
router.post('/verify-otp', verifyOtp);
router.post('/test/verify-otp', testVerifyOtp);
router.post('/basic-registration', completeBasic);
router.post('/complete-registration', completeRegistration);
router.put('/update', protect, update);
router.post('/subscription/create', createSubscription);
router.get('/subscriptions/', getPlans);
router.get('/protected-route', protect, getProfile);
router.get('/user-filter', conditionalProtect, filterUsersWithProjectsOrProducts);
router.delete('/delete', protect, deleteAccount)
router.post('/block', protect, blockUser)
router.post('/unblock', protect, unblockUser)

// Route to flag/report a user  (POST /api/user/flag)
router.post('/flag', protect,  flagUser);

// Route to clear flag/report of a project  (POST /api/user/clearFlag)
router.post('/clearFlag', protect,  clearUserFlags);

// Image upload route
router.post('/upload-image', upload.single('image'), uploadImage);
router.post('/upload-images', upload.array('image', 10), uploadImages);

export default router;
