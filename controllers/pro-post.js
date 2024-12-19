import Post from '../models/pro-post.js';
import User from '../models/user.js';


// Controller to handle adding a new post
export const addPost = async (req, res) => {
  try {
    const { title, captions, tags, location, priceDetails, images } = req.body;

    // Create a new post with the data and the logged-in user as the creator
    const post = new Post({
      title,
      captions,
      tags,
      location,
      priceDetails,
      images,
      createdBy: req.user, // Assumes req.user contains the authenticated user's data
    });

    // Save the post to the database
    await post.save();

    // Send a success response
    res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create post', error: error.message });
  }
};


export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params; // Get post ID from the request parameters

    // Find the post by ID and delete it
    const post = await Post.findByIdAndDelete(postId);

    // If the post does not exist, return a 404 error
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Send a success response
    res.status(200).json({ message: 'Post deleted successfully', post });
  } catch (error) {
    // Handle any errors that occur
    res.status(500).json({ message: 'Failed to delete post', error: error.message });
  }
};

export const flagPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    // Check if the user has already flagged the post
    const alreadyFlagged = post.flags.some(flag => flag.flaggedBy.toString() === req.user._id.toString());
    if (alreadyFlagged) {
      return res.status(400).json({ message: 'You have already flagged this post.' });
    }

    // Add the flag
    post.flags.push({ flaggedBy: req.user._id, reason });
    post.flagCount += 1;

    // Check if flag count exceeds threshold
    const FLAG_THRESHOLD = 5;
    if (post.flagCount >= FLAG_THRESHOLD) {
      post.isViolated = true;
    }

    await post.save();
    res.status(200).json({ message: 'Post flagged successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to flag post', error: error.message });
  }
};

// Controller to list all posts
export const listAllPosts = async (req, res) => {
  try {
    // Extract page and limit from query parameters, set default values if not provided
    let { page = 1, limit = 10 } = req.query;
    const userId = req.user._id; // ID of the current logged-in user

    // Fetch the list of blocked users for the current user
    const user = await User.findById(userId);
    const blockedUsers = user.blockedUsers || [];

    // Query posts while excluding blocked users
    const query = { createdBy: { $nin: blockedUsers }, isViolated: false };

    // Convert page and limit to integers
    page = parseInt(page);
    limit = parseInt(limit);

    // Validate page and limit
    if (isNaN(page) || page < 1) {
      page = 1;
    }
    if (isNaN(limit) || limit < 1) {
      limit = 10;
    }

    // Set up pagination options
    const options = {
      page,
      limit,
      populate: { path: 'createdBy', select: '-password' },
      sort: { createdAt: -1 }, // Optional: Sort by 'createdAt' descending
    };

    // Use the paginate method provided by mongoose-paginate-v2
    const result = await Post.paginate(query, options);

    // Send the paginated response
    res.status(200).json({
      currentPage: result.page,
      totalPages: result.totalPages,
      totalPosts: result.totalDocs,
      posts: result.docs,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve posts', error: error.message });
  }
};


// Controller to list posts created by the authenticated user
export const listUserPosts = async (req, res) => {
  try {
    // Extract page, limit, sortBy, and order from query, set default values
    let { page = 1, limit = 10, sortBy = 'createdAt', order = 'desc' } = req.query;

    // Convert page and limit to integers
    page = parseInt(page);
    limit = parseInt(limit);

    // Validate page and limit
    if (isNaN(page) || page < 1) {
      page = 1;
    }
    if (isNaN(limit) || limit < 1) {
      limit = 10;
    }

    // Determine sort order
    const sortOrder = order === 'asc' ? 1 : -1;

    // Calculate the number of documents to skip
    const skip = (page - 1) * limit;

    // Fetch the authenticated user's blockedUsers list
    const authenticatedUser = await User.findById(req.user._id).select('blockedUsers');
    const blockedUsers = authenticatedUser?.blockedUsers || [];

    // Fetch posts created by the authenticated user with pagination, sorting, and filtering out blocked users
    const posts = await Post.find({
      createdBy: req.user._id,
      isViolated: false,
      createdBy: { $nin: blockedUsers }, // Exclude posts from blocked users
    })
      .populate('createdBy', '-password')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .exec();

    // Get total count of user's posts for pagination info
    const total = await Post.countDocuments({ createdBy: req.user._id, isViolated: false });
    const totalPages = Math.ceil(total / limit);

    // Check if requested page exceeds total pages
    if (page > totalPages && totalPages !== 0) {
      return res.status(400).json({
        message: 'Page number exceeds total pages.',
        currentPage: page,
        totalPages,
        totalPosts: total,
        posts: [],
      });
    }

    // Send the paginated response
    res.status(200).json({
      currentPage: page,
      totalPages,
      totalPosts: total,
      posts,
    });
  } catch (error) {
    console.error('Error retrieving user posts:', error);
    res.status(500).json({ message: 'Failed to retrieve user posts', error: error.message });
  }
};




//Admin Dashboard APIs for Posts

export const getFlaggedPosts = async (req, res) => {
  try {
    const flaggedPosts = await Post.find({ 'flags.0': { $exists: true } }).populate('flags.flaggedBy', 'username email');
    res.status(200).json({ flaggedPosts });
  } catch (error) {
    res.status(500).json({ message: 'Failed to retrieve flagged posts', error: error.message });
  }
};

export const handleFlaggedPost = async (req, res) => {
  try {
    const { postId, action } = req.body; // Action can be "delete" or "ignore"

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found.' });
    }

    if (action === 'delete') {
      await post.remove();
      return res.status(200).json({ message: 'Post deleted successfully.' });
    } else if (action === 'ignore') {
      post.flags = [];
      post.flagCount = 0;
      post.isViolated = false;
      await post.save();
      return res.status(200).json({ message: 'Post flags ignored successfully.' });
    }

    res.status(400).json({ message: 'Invalid action.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to handle flagged post', error: error.message });
  }
};
