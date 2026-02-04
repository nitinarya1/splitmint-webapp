import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        maxlength: [100, 'Email cannot be more than 100 characters'],
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        select: false, // Do not return password by default
    },
    avatar: {
        type: String,
        default: '/default-avatar.png',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.User || mongoose.model('User', UserSchema);
