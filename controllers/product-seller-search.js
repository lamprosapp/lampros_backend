// controllers/searchController.js
import Category from '../models/catogory.js';
import Brand from '../models/brand.js';
import Product from '../models/pro-products.js';
import User from '../models/user.js';

export const fuzzySearchProductSellers = async (req, res) => {
    const { q = '', page = 1, limit = 10 } = req.query;

    try {
        const parsedPage = parseInt(page, 10) < 1 ? 1 : parseInt(page, 10);
        const parsedLimit = parseInt(limit, 10) < 1 ? 10 : parseInt(limit, 10);
        const skip = (parsedPage - 1) * parsedLimit;

        // Build the regex for fuzzy matching
        const regex = new RegExp(q.split('').join('.*'), 'i'); // Fuzzy matching regex

        // Fetch the current logged-in user's details to get their blockedUsers list
        const userId = req?.user;
        const user = userId ? await User.findById(userId) : null;
        const blockedUsers = user?.blockedUsers || [];

        // Fetch Product Seller users with pagination
        const [productSellers, productSellersTotal] = await Promise.all([
            User.find({
                $and: [
                    { role: 'Product Seller' },
                    { isViolated: { $ne: true } }, // Exclude users with isViolated set to true
                    { _id: { $nin: blockedUsers } }, // Exclude blocked users
                    {
                        $or: [
                            { fname: regex },
                            { lname: regex },
                            { 'companyDetails.companyName': regex },
                            { 'companyDetails.companyAddress.place': regex },
                            { 'companyDetails.companyPhone': regex },
                            { 'companyDetails.companyEmail': regex },
                            { 'companyDetails.companyGstNumber': regex },
                        ]
                    }
                ]
            }).skip(skip).limit(parsedLimit).lean(),
            User.countDocuments({
                $and: [
                    { role: 'Product Seller' },
                    { isViolated: { $ne: true } },
                    { _id: { $nin: blockedUsers } },
                    {
                        $or: [
                            { fname: regex },
                            { lname: regex },
                            { 'companyDetails.companyName': regex },
                            { 'companyDetails.companyAddress.place': regex },
                            { 'companyDetails.companyPhone': regex },
                            { 'companyDetails.companyEmail': regex },
                            { 'companyDetails.companyGstNumber': regex },
                        ]
                    }
                ]
            }),
        ]);

        // If there are Product Seller users, fetch their products
        let productSellersWithDetails = [];
        if (productSellers.length > 0) {
            const productSellerIds = productSellers.map(user => user._id);

            // Fetch products associated with Product Seller users
            const [products, productsTotal] = await Promise.all([
                Product.find({
                    createdBy: { $in: productSellerIds },
                    $or: [
                        { name: regex },
                        { about: regex }
                    ]
                }).populate('brand').populate('createdBy').skip(skip).limit(parsedLimit).lean(),
                Product.countDocuments({
                    createdBy: { $in: productSellerIds },
                    $or: [
                        { name: regex },
                        { about: regex }
                    ]
                }),
            ]);

            // Map products to their respective users
            const productsByUser = productSellerIds.reduce((acc, userId) => {
                acc[userId] = [];
                return acc;
            }, {});

            products.forEach(product => {
                const userId = product.createdBy._id.toString();
                if (productsByUser[userId]) {
                    productsByUser[userId].push(product);
                }
            });

            // Attach products to each Product Seller user
            productSellersWithDetails = productSellers.map(user => {
                const userWithDetails = { ...user };
                userWithDetails.products = productsByUser[user._id.toString()] || [];
                return userWithDetails;
            });
        }

        // Combine results with pagination info
        res.status(200).json({
            success: true,
            results: {
                productSellers: {
                    data: productSellersWithDetails,
                    currentPage: parsedPage,
                    totalPages: Math.ceil(productSellersTotal / parsedLimit),
                    totalResults: productSellersTotal
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
