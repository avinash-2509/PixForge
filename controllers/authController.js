// controllers/authController.js
import { configDotenv } from 'dotenv';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Note the mandatory .js extension for ES Modules
configDotenv();

// Unit 2.2: Sign-Up Processing Handler
export const registerUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password allocations are mandatory.' });
    }

    // Verify tenant credential uniqueness against MongoDB
    const accountConflictExists = await User.findOne({ username });
    if (accountConflictExists) {
      return res.status(409).json({ error: 'Identity identifier conflict. Allocation denied.' });
    }

    // Securely hash raw passwords using bcryptjs salt rounds before database commit
    const cryptSalt = await bcrypt.genSalt(10);
    const securelyHashedPassword = await bcrypt.hash(password, cryptSalt);

    const createdUser = await User.create({
      username,
      password: securelyHashedPassword
    });

    // Auto-issue a signed token instantly upon successful onboarding validation
    const token = jwt.sign({ userId: createdUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Onboarding verification complete. User registered.',
      user: { id: createdUser._id, username: createdUser.username },
      token
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Unit 2.3: Verification Challenge & Session Granting Handler
export const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Identification data parameters missing.' });
    }

    const identifiedUser = await User.findOne({ username });
    if (!identifiedUser) {
      return res.status(401).json({ error: 'Invalid identity verification signature.' });
    }

    // Perform verification match against stored database hash
    const matchIsValid = await bcrypt.compare(password, identifiedUser.password);
    if (!matchIsValid) {
      return res.status(401).json({ error: 'Authentication challenge signature rejected.' });
    }

    // Generate signed web verification envelope matching security standards
    const token = jwt.sign({ userId: identifiedUser._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Authentication validated. Token issued.',
      user: { id: identifiedUser._id, username: identifiedUser.username },
      token
    });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};