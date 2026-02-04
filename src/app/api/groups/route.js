import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';
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

export async function POST(req) {
    try {
        await dbConnect();

        // We need to parse auth token manually since we don't have middleware just yet
        // Or we rely on the client sending it.
        // Ideally, for the API, we should check the Authorization header.

        // Simplification: Assume client sends token in header "Authorization: Bearer <token>"

        const userId = await getUser(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, description, participants } = await req.json();

        if (!name) {
            return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
        }

        // Process participants
        // Participants array from client: [{ email: '...', name: '...' }]
        // We need to map emails to User IDs if they exist.

        const processedParticipants = [];
        const creator = await User.findById(userId);

        // Add creator as participant
        processedParticipants.push({
            user: userId,
            name: creator.name,
            avatar: creator.avatar
        });

        if (participants && Array.isArray(participants)) {
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

                // Spec: Max 3 participants + primary user. 
                // We should check this limit. 

                processedParticipants.push({
                    user: pUserId,
                    name: pName,
                    avatar: pAvatar
                });
            }
        }

        if (processedParticipants.length > 4) {
            return NextResponse.json({ error: 'Max 3 additional participants allowed' }, { status: 400 });
        }

        const group = await Group.create({
            name,
            description,
            createdBy: userId,
            participants: processedParticipants,
        });

        return NextResponse.json({ success: true, data: group }, { status: 201 });

    } catch (error) {
        console.error('Create Group Error:', error);
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

        // Find groups where user is a participant or creator
        const groups = await Group.find({
            'participants.user': userId
        }).sort({ createdAt: -1 });

        return NextResponse.json({ success: true, data: groups });

    } catch (error) {
        console.error('Get Groups Error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
