// routes/searchRoutes.js
import express from 'express';
import { fuzzySearchProductSellers  } from '../controllers/product-seller-search.js';
import { protect } from '../middlewares/protect.js';

const router = express.Router();

// Custom middleware to conditionally apply 'protect'
const conditionalProtect = (req, res, next) => {
    if (req.query.user === 'guest') {
      return next(); // Skip protect middleware if user=guest
    }
    return protect(req, res, next); // Apply protect middleware otherwise
  };

// Fuzzy search route with letter support
router.get('/search',conditionalProtect, fuzzySearchAll);

// Fuzzy search route with letter support for Product Seller only
router.get('/search/product-seller',conditionalProtect, fuzzySearchProductSellers);

export default router;
