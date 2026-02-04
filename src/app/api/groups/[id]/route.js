import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
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

export async function GET(req, { params }) {
    try {
        await dbConnect();
        const userId = await getUser(req);
        const { id } = await params;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const group = await Group.findById(id);

        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        const isParticipant = group.participants.some(p => p.user?.toString() === userId.toString());
        const isCreator = group.createdBy.toString() === userId.toString();

        if (!isParticipant && !isCreator) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json({ success: true, data: group });

    } catch (error) {
        console.error('Get Group Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const userId = await getUser(req);
        const { id } = await params;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const group = await Group.findById(id);
        if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

        if (group.createdBy.toString() !== userId.toString()) {
            return NextResponse.json({ error: 'Only creator can delete group' }, { status: 403 });
        }

        await Group.deleteOne({ _id: id });
        return NextResponse.json({ success: true, data: {} });

    } catch (error) {
        console.error('Delete Group Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
