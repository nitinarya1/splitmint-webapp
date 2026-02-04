import mongoose from 'mongoose';

const SplitSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Can be null if it's a non-registered participant
    },
    name: String, // To identify participant if user ID is missing
    amount: Number,
}, { _id: false });

const ExpenseSchema = new mongoose.Schema({
    description: {
        type: String,
        required: [true, 'Please provide a description'],
    },
    amount: {
        type: Number,
        required: [true, 'Please provide an amount'],
    },
    payer: {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        name: String
    },
    group: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Group',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    splitType: {
        type: String,
        enum: ['EQUAL', 'CUSTOM', 'PERCENTAGE'],
        default: 'EQUAL',
    },
    splits: [SplitSchema],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
