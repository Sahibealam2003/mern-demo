const User = require("../model/userSchema");

exports.signupRoute = async (req, res) => {
  try {
    const { name, email } = req.body;

    // validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // create user
    const user = await User.create({ name, email });

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};




exports.getUserRoute = async (req, res) => {
  try {
    const users = await User.find();

    return res.status(200).json({data: users});

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
