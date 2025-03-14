import { createOtpRequest, verifyOtpAndLogin, updateUserDetails } from '../functions/otp.js';
import { generateToken, verifyToken } from '../config/jwt.js';
import User from '../models/user.js';
import ProProject from '../models/pro-projects.js';
import Product from '../models/pro-products.js';
import Brand from '../models/brand.js';
import Category from '../models/catogory.js';
import { sendSmsvia2fact } from '../services/smsService.js';
import admin from '../config/firebase-config.js'
import Otp from '../models/otp.js';
import DeletionLog from '../models/deletionLog.js';
import crypto from 'crypto';

export const requestOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    const response = await createOtpRequest(phoneNumber);
    res.status(200).json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const testVerifyOtp = async (req, res) => {
  try {
    const { idToken, phoneNumber, otp } = req.body;
    console.log("idToken+ phoneNumber+ otp" + idToken + phoneNumber + otp)
    // Verify the ID token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    if (decodedToken) {
      try {
        const otpInstance = await Otp.create({
          phoneNumber,
          otp: otp,
          isVerified: true,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });
      } catch (error) {
        res.status(500).json({ message: 'Failed to save OTP', error });
      }
    } else {
      return res.status(401).json({ message: 'Invalid ID token' });
    }

    // const phoneNumber1 = decodedToken.phone_number;
    // console.log("phoneNumber1: " + phoneNumber1)

    let user = await User.findOne({ phoneNumber });
    let message;

    if (!user) {
      // Create a new user if none exists
      user = new User({ phoneNumber });
      await user.save();
      message = { message: 'User created, please complete registration.' };
    }

    // Check if essential details are present
    const isCompleteProfile = user.fname && user.address;

    if (!isCompleteProfile) {
      message = { message: 'User exists, but registration incomplete. Please complete your details.' };
    } else {
      message = { message: 'User logged in successfully.' };
    }

    // Generate JWT token for your application
    const token = generateToken(user._id);

    res.status(200).json({
      message: message.message,
      token,
      role: user?.role || 'user', // Adjust based on your User schema
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    const response = await verifyOtpAndLogin(phoneNumber, otp);

    // Generate JWT token
    const user = await User.findOne({ phoneNumber });
    const token = generateToken(user._id);

    res.status(200).json({ message: response.message, token, role: response?.role });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user;

    const { reasonToDelete } = req.body;

    if (!reasonToDelete) {
      return res.status(400).json({ message: "Reason for deletion is required" });
    }

    // Find user before deletion
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    await DeletionLog.create({
      userId,
      reason: reasonToDelete,
      userDetails: {
        phoneNumber: user.phoneNumber,
        createdAt: user.createdAt,
      },
    });

    // Delete the user document
    await User.findByIdAndDelete(userId)

    // Delete all ProProjects created by the user
    await ProProject.deleteMany({ createdBy: userId })

    // Delete all Products created by the user
    await Product.deleteMany({ createdBy: userId })


    res.status(200).json({ message: 'Account and all associated data deleted successfully.' });
  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({ message: 'Failed to delete account. Please try again later.' });
  }
};

export const completeBasic = async (req, res) => {
  try {
    const { phoneNumber, fname, lname, profileImage, address } = req.body;

    // Filter out null or undefined fields
    const updateData = {};
    if (fname) updateData.fname = fname;
    if (lname) updateData.lname = lname;
    if (profileImage) updateData.profileImage = profileImage;
    if (address) updateData.address = address;

    // Update user details if there is data to update
    if (Object.keys(updateData).length > 0) {
      await updateUserDetails(phoneNumber, updateData);
    }

    // Fetch the updated user to generate the token
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = generateToken(user._id);

    res.status(200).json({ message: 'Registration complete', token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const {
      fname, lname, profileImage, role, type, email,
      companyDetails, address, age, gender, token,
    } = req.body;

    // Helper functions for specific checks
    const isNonEmptyString = (str) => typeof str === 'string' && str.trim().length > 0;
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const isValidNumber = (num) => typeof num === 'number' && num > 0;

    // Fetch the existing user document to retain existing fields
    const existingUser = await User.findById(req.user);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log("Existing User:", existingUser);

    // Helper function to merge fields only if the new value is valid
    const mergeField = (existing, newField, validator) => {
      const mergedValue = newField && validator(newField) ? newField : existing;
      console.log(`Merging field - Existing: ${existing}, New: ${newField}, Merged: ${mergedValue}`);
      return mergedValue;
    };
    // Merge and validate company details (including companyAddress)
    const updatedCompanyDetails = {
      companyName: mergeField(existingUser.companyDetails?.companyName, companyDetails?.companyName, isNonEmptyString),
      companyEmail: mergeField(existingUser.companyDetails?.companyEmail, companyDetails?.companyEmail, isValidEmail),
      companyPhone: mergeField(existingUser.companyDetails?.companyPhone, companyDetails?.companyPhone, isNonEmptyString),
      companyGstNumber: mergeField(existingUser.companyDetails?.companyGstNumber, companyDetails?.companyGstNumber, isNonEmptyString),
      experience: mergeField(existingUser.companyDetails?.experience, companyDetails?.experience, isValidNumber),
      companyAddress: {
        place: mergeField(existingUser.companyDetails?.companyAddress?.place, companyDetails?.companyAddress?.place, isNonEmptyString),
        pincode: mergeField(existingUser.companyDetails?.companyAddress?.pincode, companyDetails?.companyAddress?.pincode, isValidNumber),
      },
      bio: mergeField(existingUser.companyDetails?.bio, companyDetails?.bio, isNonEmptyString),
    };

    console.log("Updated Company Details:", updatedCompanyDetails);

    // Include updated fields in the update object
    const updatedFields = {
      ...(isNonEmptyString(fname) && { fname }),
      ...(isNonEmptyString(lname) && { lname }),
      profileImage: profileImage && profileImage !== "" ? profileImage : existingUser.profileImage,
      ...(isNonEmptyString(role) && { role }),
      ...(isNonEmptyString(type) && { type }),
      ...(isValidEmail(email) && { email }),
      ...(companyDetails && { companyDetails: updatedCompanyDetails }), // Use deep-merged object
      ...(address && { address }),
      ...(isValidNumber(age) && { age }),
      ...(isNonEmptyString(gender) && { gender }),
      ...(isNonEmptyString(token) && { token })
    };

    console.log("Updated Fields to Save:", updatedFields);

    // Update user details using req.user.id
    const user = await User.findByIdAndUpdate(req.user, { $set: updatedFields }, { new: true });


    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log("Updated User:", user);
    res.status(200).json({ message: 'User details updated successfully', user });
  } catch (error) {
    console.error("Error occurred:", error);
    res.status(400).json({ message: error.message });
  }
};






export const completeRegistration = async (req, res) => {
  try {
    const {
      phoneNumber,
      fname,
      lname,
      profileImage,
      role,
      type,
      email,
      companyDetails,
      address,
      couponCode,
      age,
      gender,
      referral,
      subscriptionType,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    const isNotEmpty = (value) => value !== undefined && value !== null && value !== '';
    const normalizedSubscriptionType = subscriptionType?.toLowerCase();

    // Array to track empty required fields
    const emptyFields = [];

    if (!isNotEmpty(fname)) emptyFields.push('fname');
    if (!isNotEmpty(lname)) emptyFields.push('lname');
    if (!isNotEmpty(role)) emptyFields.push('role');
    if (!isNotEmpty(email)) emptyFields.push('email');
    if (!isNotEmpty(address)) emptyFields.push('address');

    // Check for required fields based on subscription type
    if (normalizedSubscriptionType === 'free') {
      if (!isNotEmpty(couponCode)) {
        return res.status(400).json({ message: 'Invalid or missing coupon code' });
      }
    }
    else if (['1 month', '6 months', '12 months'].includes(normalizedSubscriptionType)) {
      // Validate Razorpay signature
      const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }
    }
    else {
      return res.status(400).json({ message: 'Invalid subscription type' });
    }

    // If any required fields are empty, return an error response
    if (emptyFields.length > 0) {
      return res.status(400).json({
        message: 'The following required fields are empty:',
        emptyFields,
      });
    }

    // Build the updated fields object
    const updatedFields = {
      fname,
      lname,
      age,
      gender,
      profileImage: isNotEmpty(profileImage)
        ? profileImage
        : 'https://static.vecteezy.com/system/resources/previews/009/734/564/non_2x/default-avatar-profile-icon-of-social-media-user-vector.jpg',
      role,
      type,
      email,
      ...(isNotEmpty(companyDetails) && { companyDetails }),
      ...(isNotEmpty(address) && { address }),
    };

    if (referral) {
      if (referral.marketing) {
        updatedFields.referral = {
          marketing: {
            employeeName: referral.marketing.employeeName || '',
            employeeCode: referral.marketing.employeeCode || '',
          },
        };
      } else if (referral.affiliate) {
        updatedFields.referral = {
          affiliate: {
            firmName: referral.affiliate.firmName || '',
            registeredMobileNumber: referral.affiliate.registeredMobileNumber || '',
          },
        };
      }
    }

    // Add premium subscription details if applicable
    if (['1 month', '6 months', '12 months'].includes(normalizedSubscriptionType)) {
      const now = new Date();
      const expiresAt = new Date(now);

      if (normalizedSubscriptionType === '1 month') expiresAt.setMonth(expiresAt.getMonth() + 1);
      if (normalizedSubscriptionType === '6 months') expiresAt.setMonth(expiresAt.getMonth() + 6);
      if (normalizedSubscriptionType === '12 months') expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      updatedFields.premium = {
        isPremium: true,
        category: 'premium',
        duration: normalizedSubscriptionType,
        startedAt: now,
        expiresAt,
      };
    } else {
      updatedFields.premium = { isPremium: false };
    }

    // Update user details in the database
    const response = await updateUserDetails(phoneNumber, updatedFields);

    // Fetch the updated user to generate the token
    const user = await User.findOne({ phoneNumber });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a token for the user
    const token = generateToken(user._id);

    // Optional: Send a welcome message via SMS
    // await sendSmsvia2fact(phoneNumber, `Your welcome message here...`);

    res.status(200).json({ message: 'Registration complete', token });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


export const getProfile = async (req, res) => {
  try {
    // Get the user ID from the request (set by the protect middleware)
    const userId = req.user;

    // Fetch the user profile from the database
    const user = await User.findById(userId).select('-password -__v').populate('blockedUsers'); // Exclude password and other unnecessary fields

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



export const getUserById = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }

    // Fetch the user by ID, excluding the password
    const user = await User.findById(userId).select('-password -__v').populate('blockedUsers').exec(); // Exclude password and other unnecessary fields


    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Convert Mongoose document to a plain JavaScript object
    let userWithDetails = user.toObject();

    // Depending on the role, fetch related projects or products
    if (user.role === 'Realtor' || user.role === 'Professionals') {
      // Fetch ProProjects where createdBy matches the user's _id
      const projects = await ProProject.find({ createdBy: user._id })
        .populate('createdBy')
        .exec();
      userWithDetails.projects = projects || [];
    } else if (user.role === 'Product Seller') {
      // Fetch Products where createdBy matches the user's _id
      const products = await Product.find({ createdBy: user._id })
        .populate('createdBy')
        .populate('brand')
        .exec();
      userWithDetails.products = products || [];
    } else {
      userWithDetails.projects = [];
      userWithDetails.products = [];
    }

    // Return the user details with projects/products
    res.status(200).json(userWithDetails);
  } catch (error) {
    console.error('Error retrieving user details:', error);
    res.status(500).json({ message: 'Failed to retrieve user details', error: error.message });
  }
};

export const uploadImage = async (req, res) => {
  try {
    // Handle image upload
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    console.log(req)

    res.status(200).json({
      message: 'File uploaded successfully',
      file: {
        url: req.file
      }
    });
  } catch (error) {
    console.log(error)
    res.status(400).json({ message: error.message });
  }
};


export const uploadImages = async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Log the entire request for debugging
    console.log(req);

    // Prepare an array of uploaded file URLs
    const uploadedFiles = req.files.map(file => ({
      url: file.path, // Cloudinary URL
      filename: file.filename // Cloudinary filename
    }));

    res.status(200).json({
      message: 'Files uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message });
  }
};



export const filterUsersWithProjectsOrProducts = async (req, res) => {
  try {
    // Extract query parameters and pagination settings
    const { role, type, page = 1, limit = 10 } = req.query;

    // Parse and validate pagination parameters
    const parsedPage = parseInt(page, 10) < 1 ? 1 : parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10) < 1 ? 10 : parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build a filter object for MongoDB
    let filter = { isViolated: { $ne: true } };

    if (role) {
      const roleArray = role.split(','); // Split by comma for multiple roles
      filter.role = { $in: roleArray };
    }

    if (type) {
      const typeArray = type.split(','); // Split by comma for multiple types
      filter.type = { $in: typeArray };
    }

    // Get the current user's blocked users
    const userId = req?.user;
    const user = userId ? await User.findById(userId) : null;
    const blockedUsers = user?.blockedUsers || [];

    // Build a filter object for MongoDB
    filter._id = { $nin: blockedUsers };


    // Fetch users based on the role and type with pagination
    const usersPromise = User.find(filter)
      .select('-password') // Exclude password and other unnecessary fields
      .skip(skip)
      .limit(parsedLimit)
      .exec();

    const countPromise = User.countDocuments(filter).exec();

    const [users, total] = await Promise.all([usersPromise, countPromise]);

    // Prepare an array to store users with their projects/products
    const usersWithProjectsOrProducts = await Promise.all(
      users.map(async (user) => {
        let userWithDetails = user.toObject(); // Convert Mongoose doc to plain object

        // Depending on the role, fetch related projects or products
        if (user.role === 'Realtor' || user.role === 'Professionals') {
          // Fetch ProProjects where createdBy matches the user's _id
          const projects = await ProProject.find({ createdBy: user._id }).populate('createdBy').exec();
          userWithDetails.projects = projects || []; // Default to an empty array if null
        } else if (user.role === 'Product Seller') {
          // Fetch Products where createdBy matches the user's _id
          const products = await Product.find({ createdBy: user._id }).populate('createdBy').populate('brand').exec();
          userWithDetails.products = products || []; // Default to an empty array if null
        } else {
          // Default empty arrays for roles that don't match
          userWithDetails.projects = [];
          userWithDetails.products = [];
        }

        return userWithDetails;
      })
    );

    // Calculate total pages
    const totalPages = Math.ceil(total / parsedLimit);

    // Handle case where requested page exceeds total pages
    if (parsedPage > totalPages && totalPages !== 0) {
      return res.status(400).json({
        message: 'Page number exceeds total pages.',
        currentPage: parsedPage,
        totalPages,
        totalUsers: total,
        users: [],
      });
    }

    // Return the filtered users with their projects/products and pagination info
    res.status(200).json({
      currentPage: parsedPage,
      totalPages,
      totalUsers: total,
      users: usersWithProjectsOrProducts,
    });
  } catch (error) {
    console.error('Error retrieving users with projects/products:', error);
    res.status(500).json({ message: 'Failed to retrieve users with projects/products', error: error.message });
  }
};


export const blockUser = async (req, res) => {
  try {
    const { userIdToBlock } = req.body; // ID of the user to block
    const userId = req?.user; // ID of the current logged-in user (assumes authentication middleware)

    // Check if the user exists
    const userToBlock = await User.findById(userIdToBlock);
    if (!userToBlock) {
      return res.status(404).json({ message: 'User to block not found.' });
    }

    // Check if the user is trying to block themselves
    if (userId === userIdToBlock) {
      return res.status(400).json({ message: 'You cannot block yourself.' });
    }

    // Update the blockedUsers array
    const user = await User.findByIdAndUpdate(
      userId,
      { $addToSet: { blockedUsers: userIdToBlock } }, // Add to set to avoid duplicates
      { new: true }
    ).populate('blockedUsers');

    // Respond with the updated list of blocked users
    res.status(200).json({ message: 'User blocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to block user', error: error.message });
  }
};


export const unblockUser = async (req, res) => {
  try {
    const { userIdToUnblock } = req.body; // ID of the user to unblock
    const userId = req?.user; // ID of the current logged-in user (assumes authentication middleware)
    // Check if the user exists
    const userToUnblock = await User.findById(userIdToUnblock);
    if (!userToUnblock) {
      return res.status(404).json({ message: 'User to unblock not found.' });
    }

    // Check if the user is trying to block themselves
    if (userId === userIdToUnblock) {
      return res.status(400).json({ message: 'You cannot unblock yourself.' });
    }

    // Check if the user is not blocking the user to unblock
    const cuser = await User.findById(userId);
    if (!cuser.blockedUsers.includes(userIdToUnblock)) {
      return res.status(400).json({ message: 'User is not in the blocked list.' });
    }

    // Update the blockedUsers array
    const user = await User.findByIdAndUpdate(
      userId,
      { $pull: { blockedUsers: userIdToUnblock } }, // Remove from the array
      { new: true }
    ).populate('blockedUsers');

    res.status(200).json({ message: 'User unblocked successfully', blockedUsers: user.blockedUsers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to unblock user', error: error.message });
  }
};


export const flagUser = async (req, res) => {
  try {
    const { userId, reason } = req.body; // The project ID and the reason for flagging
    const flaggedBy = req?.user || 'guest'; // ID of the user who is flagging the project

    // Find the project to flag
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Add a new flag to the project's flags array
    const flag = {
      reason,
      flaggedBy,
      timestamp: new Date(),
    };

    // Add the flag and increment the flagCount
    user.flags.push(flag);
    user.flagCount += 1;

    // Check if flagCount reaches 5 and mark the user as violated
    if (user.flagCount >= 5) {
      user.isViolated = true;
    }

    // Save the updated user
    await user.save();

    res.status(200).json({ message: 'User flagged successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to flag user', error: error.message });
  }
};

export const clearUserFlags = async (req, res) => {
  try {
    const { userId } = req.body; // The project ID whose flags should be cleared

    // Find the project to clear flags from
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Clear the flags array and reset flagCount and isViolated
    user.flags = [];
    user.flagCount = 0;
    user.isViolated = false;

    // Save the updated user
    await user.save();

    res.status(200).json({ message: 'Flags cleared successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to clear flags', error: error.message });
  }
};
