"use server";

import dbConnect from "@/lib/db/mongoose";
import User from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { RegisterSchema, type RegisterInput } from "@/validators/auth";

export async function registerUser(input: RegisterInput) {
  try {
    // 1. Validate input using Zod
    const parsedData = RegisterSchema.safeParse(input);

    if (!parsedData.success) {
      return {
        success: false,
        error: "Invalid registration data provided.",
      };
    }

    const { name, email, password } = parsedData.data;

    // 2. Connect to MongoDB
    await dbConnect();

    // 3. Check if user already exists
    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    }

    // 4. Hash the password
    const passwordHash = await hashPassword(password);

    // 5. Create new User
    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: "USER",
      status: "ACTIVE",
    });

    // 6. Return safe result
    return {
      success: true,
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      success: false,
      error: "An unexpected error occurred during registration.",
    };
  }
}
