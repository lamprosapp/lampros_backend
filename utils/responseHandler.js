export const successResponse = (res, message, data = {}, pagination = null) => {
  const response = {
    success: true,
    message,
    data: {
      ...data,
      pagination: pagination
        ? {
            currentPage: pagination.currentPage,
            totalPages: pagination.totalPages,
            totalItems: pagination.totalItems,
          }
        : null,
    },
  };

  return res.status(200).json(response);
};

export const errorResponse = (res, statusCode, message, error = null) => {
  return res.status(statusCode).json({
    status: statusCode,
    success: false,
    message,
    error: error ? error.message || error : null,
  });
};
