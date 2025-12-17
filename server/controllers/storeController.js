const StoreConfig = require('../models/StoreConfig');

/**
 * @desc    Get store configuration
 * @route   GET /api/store/config
 * @access  Public
 */
exports.getConfig = async (req, res, next) => {
  try {
    const config = await StoreConfig.getConfig();

    res.json({
      success: true,
      data: { config },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update store configuration
 * @route   PUT /api/store/config
 * @access  Private/Admin
 */
exports.updateConfig = async (req, res, next) => {
  try {
    let config = await StoreConfig.findOne();

    if (!config) {
      config = await StoreConfig.create(req.body);
    } else {
      config = await StoreConfig.findByIdAndUpdate(config._id, req.body, {
        new: true,
        runValidators: true,
      });
    }

    res.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      data: { config },
    });
  } catch (error) {
    next(error);
  }
};


