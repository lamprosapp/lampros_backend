// controllers/searchController.js
import Category from '../models/catogory.js';
import Brand from '../models/brand.js';
import Product from '../models/pro-products.js';
import ProProject from '../models/pro-projects.js';
import User from '../models/user.js';

export const fuzzySearchAll = async (req, res) => {
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

        // Define roles to search for in the User collection
        const userRoles = ['Realtor', 'Product Seller', 'Home Owner', 'Professionals'];
        // Perform parallel searches across different collections with pagination
        const [
            categories,
            categoriesTotal,
            brands,
            brandsTotal,
            products,
            productsTotal,
            proProjects,
            proProjectsTotal,
            users,
            usersTotal
        ] = await Promise.all([
            Category.find({ name: regex }).skip(skip).limit(parsedLimit).lean(),
            Category.countDocuments({ name: regex }),
            Brand.find({ name: regex }).skip(skip).limit(parsedLimit).lean(),
            Brand.countDocuments({ name: regex }),
            Product.find({
                $or: [
                    { name: regex },
                    { about: regex }
                ]
            }).populate('brand').populate('createdBy').skip(skip).limit(parsedLimit).lean(),
            Product.countDocuments({
                $or: [
                    { name: regex },
                    { about: regex }
                ]
            }),
            ProProject.find({
                $and: [
                    {
                        $or: [
                            { projectType: regex },
                            { about: regex }
                        ]
                    },
                    { isViolated: { $ne: true } } // Exclude violated projects
                ]
            }).skip(skip).populate('createdBy').limit(parsedLimit).lean(),
            ProProject.countDocuments({
                $and: [
                    {
                        $or: [
                            { projectType: regex },
                            { about: regex }
                        ]
                    },
                    { isViolated: { $ne: true } } // Exclude violated projects
                ]
            }),
            User.find({
                $and: [
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
            }),
        ]);

        // If there are users, fetch their associated projects or products
        let usersWithDetails = [];
        if (users.length > 0) {
            // Collect user IDs based on roles
            const realtorOrProfIds = users
                .filter(user => user.role === 'Realtor' || user.role === 'Professionals')
                .map(user => user._id);
            const productSellerIds = users
                .filter(user => user.role === 'Product Seller')
                .map(user => user._id);

            // Fetch all relevant projects and products in bulk with pagination
            const [projects, projectsTotal, productsList, productsListTotal] = await Promise.all([
                ProProject.find({
                    createdBy: { $in: realtorOrProfIds },
                    isViolated: { $ne: true } // Exclude violated projects
                }).skip(skip).limit(parsedLimit).populate('createdBy').lean(),
                ProProject.countDocuments({
                    createdBy: { $in: realtorOrProfIds },
                    isViolated: { $ne: true } // Exclude violated projects
                }),
                Product.find({ createdBy: { $in: productSellerIds } }).skip(skip).limit(parsedLimit).populate('createdBy').lean(),
                Product.countDocuments({ createdBy: { $in: productSellerIds } }),
            ]);

            // Map projects and products to their respective users
            const projectsByUser = realtorOrProfIds.reduce((acc, userId) => {
                acc[userId] = [];
                return acc;
            }, {});

            projects.forEach(project => {
                // Use project.createdBy._id for mapping
                const userId = project.createdBy._id.toString();
                if (projectsByUser[userId]) {
                    projectsByUser[userId].push(project);
                }
            });

            const productsByUser = productSellerIds.reduce((acc, userId) => {
                acc[userId] = [];
                return acc;
            }, {});

            productsList.forEach(product => {
                // Use product.createdBy._id for mapping
                const userId = product.createdBy._id.toString();
                if (productsByUser[userId]) {
                    productsByUser[userId].push(product);
                }
            });

            // Attach projects or products to each user based on their role
            usersWithDetails = users.map(user => {
                const userWithDetails = { ...user };
                if (user.role === 'Realtor' || user.role === 'Professionals') {
                    userWithDetails.projects = projectsByUser[user._id.toString()] || [];
                } else if (user.role === 'Product Seller') {
                    userWithDetails.products = productsByUser[user._id.toString()] || [];
                }
                return userWithDetails;
            });

        }

        // Combine results with pagination info
        res.status(200).json({
            success: true,
            results: {
                categories: {
                    data: categories,
                    currentPage: parsedPage,
                    totalPages: Math.ceil(categoriesTotal / parsedLimit),
                    totalResults: categoriesTotal
                },
                brands: {
                    data: brands,
                    currentPage: parsedPage,
                    totalPages: Math.ceil(brandsTotal / parsedLimit),
                    totalResults: brandsTotal
                },
                products: {
                    data: products,
                    currentPage: parsedPage,
                    totalPages: Math.ceil(productsTotal / parsedLimit),
                    totalResults: productsTotal
                },
                projects: {
                    data: proProjects,
                    currentPage: parsedPage,
                    totalPages: Math.ceil(proProjectsTotal / parsedLimit),
                    totalResults: proProjectsTotal
                },
                users: {
                    data: usersWithDetails,
                    currentPage: parsedPage,
                    totalPages: Math.ceil(usersTotal / parsedLimit),
                    totalResults: usersTotal
                },
            },
            totalResults: {
                categories: categoriesTotal,
                brands: brandsTotal,
                products: productsTotal,
                projects: proProjectsTotal,
                users: usersTotal,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
