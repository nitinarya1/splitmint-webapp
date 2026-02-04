import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-me';

export async function POST(req) {
    try {
        await dbConnect();

        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Please provide email and password' }, { status: 400 });
        }

        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
            expiresIn: '7d',
        });

        const userObj = user.toObject();
        delete userObj.password;

        return NextResponse.json({
            success: true,
            data: userObj,
            token,
        });

    } catch (error) {
        console.error('Login Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
