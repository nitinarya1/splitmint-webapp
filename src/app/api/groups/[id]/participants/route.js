import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
import Expense from '@/models/Expense';
import User from '@/models/User';
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

// Add participants to existing group
export async function POST(req, { params }) {
    try {
        await dbConnect();
        const userId = await getUser(req);
        const { id } = await params;
        const { participants, includePreviousExpenses } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const group = await Group.findById(id);
        if (!group) {
            return NextResponse.json({ error: 'Group not found' }, { status: 404 });
        }

        // Only creator can add participants
        if (group.createdBy.toString() !== userId.toString()) {
            return NextResponse.json({ error: 'Only group creator can add members' }, { status: 403 });
        }

        // Process new participants
        const newParticipants = [];
        for (const p of participants) {
            let pUserId = null;
            let pName = p.name;
            let pAvatar = null;

            if (p.email) {
                const user = await User.findOne({ email: p.email });
                if (user) {
                    pUserId = user._id;
                    pName = user.name;
                    pAvatar = user.avatar;
                }
            }

            // Check if participant already exists
            const exists = group.participants.some(existing =>
                (existing.user && pUserId && existing.user.toString() === pUserId.toString()) ||
                (existing.name === pName)
            );

            if (!exists) {
                newParticipants.push({
                    user: pUserId,
                    name: pName,
                    avatar: pAvatar
                });
            }
        }

        if (newParticipants.length === 0) {
            return NextResponse.json({ error: 'All participants already in group' }, { status: 400 });
        }

        // Check total participant limit
        if (group.participants.length + newParticipants.length > 4) {
            return NextResponse.json({ error: 'Max 4 participants allowed per group' }, { status: 400 });
        }

        // Add new participants to group
        group.participants.push(...newParticipants);
        await group.save();

        // If includePreviousExpenses is true, recalculate splits for all existing expenses
        if (includePreviousExpenses) {
            const expenses = await Expense.find({ group: id, splitType: 'EQUAL' });

            for (const expense of expenses) {
                // Recalculate splits to include new members
                const totalParticipants = group.participants.length;
                const amount = expense.amount;
                const splitAmt = parseFloat((amount / totalParticipants).toFixed(2));

                let currentSum = 0;
                const newSplits = group.participants.map((p, idx) => {
                    let amt = splitAmt;
                    if (idx === totalParticipants - 1) {
                        amt = amount - currentSum; // Last person gets the remainder
                    }
                    currentSum += amt;
                    return {
                        user: p.user,
                        name: p.name,
                        amount: amt
                    };
                });

                expense.splits = newSplits;
                await expense.save();
            }
        }

        return NextResponse.json({
            success: true,
            data: group,
            message: includePreviousExpenses
                ? `Added ${newParticipants.length} member(s) and recalculated ${await Expense.countDocuments({ group: id, splitType: 'EQUAL' })} expense(s)`
                : `Added ${newParticipants.length} member(s). Previous expenses unchanged.`
        });

    } catch (error) {
        console.error('Add Participant Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
