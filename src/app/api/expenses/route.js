import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Expense from '@/models/Expense';
import Group from '@/models/Group';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-me';

// Helper to get user from token
async function getUser(req) {
    const token = req.cookies.get('token')?.value || req.headers.get('authorization')?.split(' ')[1];
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return decoded.userId;
    } catch (err) {
        return null;
    }
}

export async function POST(req) {
    try {
        await dbConnect();
        const userId = await getUser(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { description, amount, groupId, payer, splits, splitType, date } = await req.json();

        // Verify group access
        const group = await Group.findById(groupId);
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Check if user is participant
        const isParticipant = group.participants.some(p => p.user?.toString() === userId.toString());
        // Also allow creator
        const isCreator = group.createdBy.toString() === userId.toString();

        if (!isParticipant && !isCreator) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
        }

        // Create Expense
        const expense = await Expense.create({
            description,
            amount,
            group: groupId,
            payer, // { user: _id, name: 'Alice' }
            splits, // [{ user: _id, name: 'Alice', amount: 50 }]
            splitType,
            date: date || new Date(),
        });

        return NextResponse.json({ success: true, data: expense }, { status: 201 });

    } catch (error) {
        console.error('Create Expense Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function GET(req) {
    try {
        await dbConnect();
        const userId = await getUser(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const groupId = searchParams.get('groupId');

        if (!groupId) {
            return NextResponse.json({ error: 'Group ID required' }, { status: 400 });
        }

        const group = await Group.findById(groupId);
        // Auth check
        const isParticipant = group.participants.some(p => p.user?.toString() === userId.toString());
        const isCreator = group.createdBy.toString() === userId.toString();

        if (!isParticipant && !isCreator) {
            return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
        }

        const expenses = await Expense.find({ group: groupId }).sort({ date: -1 });

        return NextResponse.json({ success: true, data: expenses });
    } catch (error) {
        console.error('Get Expenses Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
