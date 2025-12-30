import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma-client';
import { JWT_SECRET } from '../config/constants';

// Helper to verify admin credentials against database
const verifyAdminCredentials = async (email: string, password: string, username?: string) => {
  try {
    const mobile = username || email;
    console.log('Verifying admin credentials for:', { mobile, email, username });
    
    // Find admin user by mobile or email
    const adminUser = await prisma.users.findFirst({
      where: {
        OR: [
          { mobile },
          { email: email || '' }
        ],
        type: 'admin',
        status: 1
      },
      select: {
        ID: true,
        email: true,
        mobile: true,
        password: true,
        company_name: true,
        status: true,
        type: true
      }
    });

    console.log('Admin user found:', adminUser ? 'Yes' : 'No');
    if (adminUser) {
      console.log('User type:', adminUser.type);
      console.log('User status:', adminUser.status);
      console.log('Password hash:', adminUser.password ? 'Exists' : 'Missing');
    }

    if (!adminUser) {
      console.log('No admin user found with these credentials');
      return null;
    }

    // Check password - handle both bcrypt and SHA-256 hashed passwords
    const isBcryptMatch = await bcrypt.compare(password, adminUser.password);
    const isDirectMatch = password === adminUser.password;
    
    // Check if stored password is a SHA-256 hash (64 chars long, hex)
    const isSha256Hash = /^[a-f0-9]{64}$/i.test(adminUser.password);
    let isSha256Match = false;
    
    if (isSha256Hash) {
      // Create SHA-256 hash of the input password
      const crypto = require('crypto');
      const inputHash = crypto.createHash('sha256').update(password).digest('hex');
      isSha256Match = inputHash === adminUser.password.toLowerCase();
    }
    
    const isMatch = isBcryptMatch || isDirectMatch || isSha256Match;
    
    console.log('Password check:', { 
      isBcryptMatch, 
      isDirectMatch,
      isMatch,
      inputPassword: password,
      storedPassword: adminUser.password
    });

    if (isMatch) {
      // Remove password from the returned user object
      const { password: _, ...userWithoutPassword } = adminUser as any;
      console.log('Login successful for admin:', userWithoutPassword.email || userWithoutPassword.mobile);
      return userWithoutPassword;
    }
    
    console.log('Password does not match');
    return null;
  } catch (error) {
    console.error('Error in verifyAdminCredentials:', error);
    return null;
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    
    if ((!username && !email) || !password) {
      return res.status(400).json({ message: 'Username/Email and password are required' });
    }

    let user = null;
    
    // First check if it's the admin user
    user = await verifyAdminCredentials(email || username, password, username);

    // If not admin or no match found, check regular users
    if (!user) {
      const whereClause = username ? { mobile: username } : { email };
      
      user = await prisma.users.findFirst({
        where: {
          ...whereClause,
          status: 1
        },
        select: { 
          ID: true, 
          password: true,
          email: true,
          company_name: true,
          mobile: true,
          status: true,
          type: true
        }
      });

      if (user) {
        const isMatch = await bcrypt.compare(password, user.password) || 
                        password === user.password; // Direct comparison as fallback
        if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }
      }
    }

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials or account not active' });
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.ID, 
        mobile: user.mobile,
        email: user.email,
        type: user.type
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove sensitive data from response
    const { password: _, ...userWithoutPassword } = user as any;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const verifyPin = async (req: Request, res: Response) => {
  try {
    const { username, pin } = req.body;

    if (!username || !pin) {
      return res.status(400).json({ 
        success: false,
        message: 'Username (mobile) and PIN are required' 
      });
    }

    // Find user by mobile number (username)
    const user = await prisma.users.findFirst({
      where: { mobile: username },
      select: {
        ID: true,
        pin: true,
        mobile: true,
        email: true,
        type: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify PIN (case-sensitive comparison)
    const isPinValid = user.pin === pin;

    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    // Remove sensitive data from response
    const { pin: _, ...userWithoutPin } = user;

    return res.json({
      success: true,
      message: 'PIN verified successfully',
      user: userWithoutPin
    });

  } catch (error) {
    console.error('Error verifying PIN:', error);
    return res.status(500).json({
      success: false,
      message: 'Error verifying PIN',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { 
      email, 
      password, 
      username, 
      company_name = 'New User',
      brand_name = 'New Brand',
      owner_name = 'Owner',
      pan_number = 'ABCDE1234F',
      account_number = '1234567890',
      ifsc_code = 'HDFC0001234',
      bank_name = 'HDFC Bank'
    } = req.body;

    const mobile = username || email;

    // Validate required fields
    if (!email || !password || !username || !mobile) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if user already exists
    const existingUser = await prisma.users.findFirst({
      where: {
        OR: [
          { email },
          { mobile }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'User with this email, username or mobile already exists',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.users.create({
  data: {
    email,
    password: hashedPassword,
    mobile,
    company_name,
    brand_name,
    owner_name,
    pan_number,
    account_number,
    ifsc_code,
    bank_name,
    balance: 0,  // Make sure to include default values for required fields
    commission: 0,
    type: "user", // Make sure to set the type as required by your schema
    status: 1,    // Assuming 1 means active, adjust as needed
    date: new Date(),
    admin_id: 1,  // You need to provide an admin_id here
    // Add other required fields from the schema
    value1: "1804",
    value2: "1805",
    value3: 3,
    value4: 0,
    value5: 0,
    pin: "7777",
    block: 0,
    portal_charge: 0,
    aeps_plan_id: 1806,
    aeps_status: "false"
  }
});
    const token = jwt.sign(
      { 
        userId: user.ID, 
        email: user.email,
        type: user.type
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};