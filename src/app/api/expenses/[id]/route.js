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

export async function DELETE(req, { params }) {
    try {
        await dbConnect();
        const userId = await getUser(req);
        const { id } = await params;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const expense = await Expense.findById(id);
        if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

        // Check group access
        const group = await Group.findById(expense.group);
        const isParticipant = group.participants.some(p => p.user?.toString() === userId.toString());
        const isCreator = group.createdBy.toString() === userId.toString();

        // Spec: "Remove participants (with linked expense handling)" - user meant removing participants, but here we deleting expense. 
        // Spec: "Delete expense".
        // Any participant should be able to delete? Or just payer/creator? Let's allow group members for now.

        if (!isParticipant && !isCreator) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        await Expense.deleteOne({ _id: id });
        return NextResponse.json({ success: true, data: {} });

    } catch (error) {
        console.error('Delete Expense Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function PUT(req, { params }) {
    // Update expense logic (similar to POST but updating)
    // For MVP, deleting and re-creating is often easier for the user, but let's support basic edit (description/amount)
    // Re-calculating splits on amount change is tricky if custom splits were used. 
    // If SplitType is EQUAL, easy to re-calc.

    // Implementation omitted for brevity unless strictly needed now, sticking to Delete first for 'Manage' requirement.
    // Actually, user asked for "Edit expense". I should implement it.

    try {
        await dbConnect();
        const userId = await getUser(req);
        const { id } = await params;
        const body = await req.json(); // { description, amount, ... }

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const expense = await Expense.findById(id);
        if (!expense) return NextResponse.json({ error: 'Expense not found' }, { status: 404 });

        // If amount changed, we need to recalculate splits if they were EQUAL.
        if (body.amount && expense.splitType === 'EQUAL') {
            // Re-distribute logic similar to POST
            const group = await Group.findById(expense.group);
            const count = group.participants.length;
            const amountVal = parseFloat(body.amount);
            const splitAmt = parseFloat((amountVal / count).toFixed(2));
            let currentSum = 0;
            const newSplits = group.participants.map((p, idx) => {
                let amt = splitAmt;
                if (idx === count - 1) {
                    amt = amountVal - currentSum;
                }
                currentSum += amt;
                return {
                    user: p.user,
                    name: p.name,
                    amount: amt
                };
            });
            body.splits = newSplits;
        }

        const updatedExpense = await Expense.findByIdAndUpdate(id, body, { new: true });
        return NextResponse.json({ success: true, data: updatedExpense });

    } catch (error) {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
