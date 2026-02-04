import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a group name'],
        maxlength: [100, 'Name cannot be more than 100 characters'],
    },
    description: {
        type: String,
        maxlength: [200, 'Description cannot be more than 200 characters'],
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    // Participants can be registered users or just names
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        name: {
            type: String, // For non-registered users or display name preference
            required: true,
        },
        avatar: String,
    }],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Group || mongoose.model('Group', GroupSchema);
