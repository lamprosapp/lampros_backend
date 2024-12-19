import express from 'express';
import { addPost, deletePost, flagPost, listAllPosts, listUserPosts } from '../controllers/pro-post.js';
import { protect } from '../middlewares/protect.js'; 

// Initialize the router
const router = express.Router();

// Route to add a new post (POST /api/posts)
router.post('/posts', protect,  addPost);

// Route to delete a post by its ID (DELETE /api/posts/:postId)
router.delete('/posts/:postId', protect,  deletePost);

// Route to flag/report a post  (POST /api/posts/:postId)
router.post('/posts/:postId', protect,  flagPost);

// Route to list all posts (GET /api/posts/all)
router.get('/posts/all', listAllPosts);

// Route to list posts created by the authenticated user (GET /api/posts/user)
router.get('/posts/user',protect, listUserPosts);

export default router;
