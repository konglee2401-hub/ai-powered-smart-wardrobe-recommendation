import ClothingItem from '../models/ClothingItem.js';

export const getClothes = async (req, res) => {
  try {
    const clothes = await ClothingItem.find({ userId: req.user._id });
    res.json({ success: true, data: clothes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addClothing = async (req, res) => {
  try {
    const clothing = await ClothingItem.create({
      ...req.body,
      userId: req.user._id,
    });
    res.status(201).json({ success: true, data: clothing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateClothing = async (req, res) => {
  try {
    const clothing = await ClothingItem.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!clothing) {
      return res
        .status(404)
        .json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, data: clothing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteClothing = async (req, res) => {
  try {
    const clothing = await ClothingItem.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!clothing) {
      return res
        .status(404)
        .json({ success: false, message: 'Not found' });
    }
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
