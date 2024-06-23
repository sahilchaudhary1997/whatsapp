module.exports = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
      status: 0,
      message: 'Internal Server Error',
      error: err.message
    });
  };
  