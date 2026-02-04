'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function GroupDetails() {
    const { user } = useAuth();
    const { id } = useParams();
    const router = useRouter();

    const [group, setGroup] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mintSenseInput, setMintSenseInput] = useState('');

    // Modal State
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [addMembersForm, setAddMembersForm] = useState({
        emails: '',
        includePreviousExpenses: false
    });
    const [expenseForm, setExpenseForm] = useState({
        description: '',
        amount: '',
        payer: '',
        splitType: 'EQUAL',
        selectedParticipants: [] // NEW: Selected participants for split
    });

    useEffect(() => {
        if (user && id) {
            fetchData();
        }
    }, [user, id]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [groupRes, expenseRes] = await Promise.all([
                fetch(`/api/groups/${id}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`/api/expenses?groupId=${id}`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            const groupData = await groupRes.json();
            const expenseData = await expenseRes.json();

            if (groupData.success) setGroup(groupData.data);
            if (expenseData.success) setExpenses(expenseData.data);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Balance Calculation Logic
    const balances = useMemo(() => {
        if (!group || !expenses) return {};
        const getPId = (p) => p.user || p._id || p.name;
        const bal = {};
        group.participants.forEach(p => {
            bal[getPId(p)] = 0;
        });

        expenses.forEach(exp => {
            const payerKey = exp.payer.user || exp.payer.name;
            if (bal[payerKey] !== undefined) {
                bal[payerKey] += exp.amount;
            }
            exp.splits.forEach(split => {
                const consumerKey = split.user || split.name;
                if (bal[consumerKey] !== undefined) {
                    bal[consumerKey] -= split.amount;
                }
            });
        });
        return bal;
    }, [group, expenses]);

    // Search Filter
    const filteredExpenses = useMemo(() => {
        if (!searchTerm) return expenses;
        const lower = searchTerm.toLowerCase();
        return expenses.filter(e =>
            e.description.toLowerCase().includes(lower) ||
            e.payer.name.toLowerCase().includes(lower) ||
            e.amount.toString().includes(lower)
        );
    }, [expenses, searchTerm]);

    const handleAddExpense = async (e) => {
        if (e) e.preventDefault();
        const token = localStorage.getItem('token');

        const amountVal = parseFloat(expenseForm.amount);
        if (isNaN(amountVal) || amountVal <= 0) return alert('Invalid amount');

        // Get participants to split among
        const participantsToSplit = expenseForm.selectedParticipants.length > 0
            ? group.participants.filter(p => expenseForm.selectedParticipants.includes(p.user || p._id))
            : group.participants;

        if (participantsToSplit.length === 0) {
            return alert('Please select at least one participant');
        }

        let finalSplits = [];
        if (expenseForm.splitType === 'EQUAL') {
            const count = participantsToSplit.length;
            const splitAmt = parseFloat((amountVal / count).toFixed(2));
            let currentSum = 0;
            finalSplits = participantsToSplit.map((p, idx) => {
                let amt = splitAmt;
                if (idx === count - 1) amt = amountVal - currentSum;
                currentSum += amt;
                return { user: p.user, name: p.name, amount: amt };
            });
        } else {
            alert('Only Equal split supported currently');
            return;
        }

        const payerParticipant = group.participants.find(p => (p.user || p._id) === expenseForm.payer);
        if (!payerParticipant) return alert('Invalid Payer');

        const payload = {
            description: expenseForm.description,
            amount: amountVal,
            groupId: id,
            payer: { user: payerParticipant.user, name: payerParticipant.name },
            splits: finalSplits,
            splitType: expenseForm.splitType,
            date: new Date()
        };

        try {
            const res = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setShowAddExpense(false);
                setExpenseForm({ description: '', amount: '', payer: '', splitType: 'EQUAL', selectedParticipants: [] });
                fetchData();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert('Error adding expense');
        }
    };

    const handleDeleteExpense = async (expenseId) => {
        if (!confirm('Delete this expense?')) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/expenses/${expenseId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                fetchData();
            } else {
                alert('Failed to delete');
            }
        } catch (e) {
            alert('Error deleting');
        }
    };

    const handleMintSense = () => {
        // Import the parser dynamically (already in the file as a class)
        const { MintSenseParser } = require('@/lib/mintSenseParser');
        const parser = new MintSenseParser(group.participants);

        const result = parser.parse(mintSenseInput);

        if (result) {
            // Handle multiple expenses
            if (result.multipleExpenses) {
                alert(`✨ Found 2 expenses! Adding first one: "${result.description}" for ₹${result.amount}. Please add the second one separately: "${result.multipleExpenses.second.description}" for ₹${result.multipleExpenses.second.amount}`);
            }

            setExpenseForm({
                description: result.description,
                amount: result.amount.toString(),
                payer: result.payer.user || result.payer._id,
                splitType: 'EQUAL',
                selectedParticipants: result.selectedParticipants || []
            });
            setShowAddExpense(true);
            setMintSenseInput('');
        } else {
            alert(`❌ Couldn't parse that. Try:\n• "Alice paid 500 for Dinner"\n• "Split 600 for Lunch"\n• "Yesterday Bob spent 200 on Taxi"\n• "Alice and Bob shared 800 for Movie"`);
        }
    };

    const toggleParticipant = (participantId) => {
        setExpenseForm(prev => ({
            ...prev,
            selectedParticipants: prev.selectedParticipants.includes(participantId)
                ? prev.selectedParticipants.filter(id => id !== participantId)
                : [...prev.selectedParticipants, participantId]
        }));
    };

    const handleAddMembers = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        const emailList = addMembersForm.emails.split(',').map(email => ({ email: email.trim() })).filter(p => p.email);

        if (emailList.length === 0) {
            return alert('Please enter at least one email');
        }

        try {
            const res = await fetch(`/api/groups/${id}/participants`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    participants: emailList,
                    includePreviousExpenses: addMembersForm.includePreviousExpenses
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ ${data.message}`);
                setShowAddMembers(false);
                setAddMembersForm({ emails: '', includePreviousExpenses: false });
                fetchData(); // Refresh group and expenses
            } else {
                alert(`❌ ${data.error}`);
            }
        } catch (error) {
            alert('Failed to add members');
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse text-gray-300 text-lg">Loading Details...</div>;
    if (!group) return <div className="p-8 text-center text-red-400 text-lg font-semibold">Group not found</div>;

    return (
        <div className="min-h-screen pb-20">
            <nav className="glass border-b border-white/20 p-4 sticky top-0 z-10 backdrop-blur-xl">
                <div className="container mx-auto flex gap-4 items-center justify-between flex-wrap">
                    <div className="flex gap-4 items-center">
                        <Link href="/dashboard" className="text-gray-300 hover:text-white font-semibold transition-colors">← Back</Link>
                        <h1 className="text-2xl font-bold text-white">{group.name}</h1>
                    </div>
                    {/* Search Bar */}
                    <div className="w-full md:w-auto md:flex-1 md:max-w-sm">
                        <input
                            type="text"
                            placeholder="🔍 Search expenses..."
                            className="w-full bg-white/10 border-none focus:bg-white/15 transition-colors text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </nav>

            <main className="container mx-auto p-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-1 space-y-6">
                    {/* MintSense AI */}
                    <div className="glass-card p-5 rounded-2xl relative overflow-hidden border border-cyan-500/30">
                        <div className="absolute -top-4 -right-4 text-8xl opacity-10">🤖</div>
                        <h3 className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-3 flex items-center gap-2">
                            <span>✨</span> MintSense AI
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Try: 'Alice paid 500 for Dinner' or 'Split 600 for Lunch'"
                                className="w-full text-sm bg-white/10"
                                value={mintSenseInput}
                                onChange={e => setMintSenseInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleMintSense()}
                            />
                            <button onClick={handleMintSense} className="bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/40 px-4 rounded-lg text-sm font-bold transition-all shadow-lg">
                                🪄
                            </button>
                        </div>
                        <p className="text-xs text-cyan-200/60 mt-2">
                            💡 Tip: Try "Yesterday Alice spent 200 on Taxi" or "Alice and Bob shared 800 for Movie"
                        </p>
                    </div>

                    <div className="glass-card p-6 rounded-2xl text-center border border-white/10 space-y-3">
                        <button
                            onClick={() => {
                                const defaultPayer = group.participants.find(p => p.user === user._id) || group.participants[0];
                                setExpenseForm(prev => ({ ...prev, payer: defaultPayer.user || defaultPayer._id, selectedParticipants: [] }));
                                setShowAddExpense(true);
                            }}
                            className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/40 hover:shadow-purple-500/60 transform hover:scale-[1.02] transition-all"
                        >
                            ➕ Add New Expense
                        </button>

                        {group.createdBy.toString() === user._id && group.participants.length < 4 && (
                            <button
                                onClick={() => setShowAddMembers(true)}
                                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/40 hover:shadow-emerald-500/60 transform hover:scale-[1.02] transition-all"
                            >
                                👥 Add Members
                            </button>
                        )}
                    </div>

                    {/* Balances */}
                    <div className="glass-card p-6 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold mb-5 border-b border-white/10 pb-3 text-white">💳 Balances</h3>
                        <div className="space-y-4">
                            {group.participants.map(p => {
                                const pid = p.user || p._id || p.name;
                                const bal = balances[pid] || 0;
                                return (
                                    <div key={pid} className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shadow-lg">
                                                {p.name[0]?.toUpperCase()}
                                            </div>
                                            <span className="text-sm font-semibold text-gray-200">{p.name}</span>
                                        </div>
                                        <span className={`font-mono font-bold text-base ${bal > 0 ? 'text-green-400' : bal < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                                            {bal === 0 ? '✓ Settled' : bal > 0 ? `+₹${bal.toFixed(2)}` : `-₹${Math.abs(bal).toFixed(2)}`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Column: Expenses */}
                <div className="lg:col-span-2">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h3 className="text-2xl font-bold text-white">Recent Activity</h3>
                            <p className="text-sm text-gray-400 mt-1">{filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {filteredExpenses.length === 0 ? (
                            <div className="text-center py-16 glass-card rounded-2xl border border-dashed border-white/20">
                                <div className="text-6xl mb-4">📝</div>
                                <p className="text-gray-300 font-semibold">
                                    {searchTerm ? 'No expenses match your search.' : 'No expenses yet.'}
                                </p>
                                {!searchTerm && <p className="text-gray-400 text-sm mt-2">Add your first expense to get started!</p>}
                            </div>
                        ) : (
                            filteredExpenses.map(exp => (
                                <div key={exp._id} className="glass-card p-5 rounded-2xl flex justify-between items-center hover:bg-white/10 transition-all group relative border border-white/10">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-3 rounded-xl text-white shadow-lg">
                                            💰
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-white text-lg">{exp.description}</h4>
                                            <p className="text-sm text-gray-300 mt-1">
                                                <span className="font-semibold text-purple-400">{exp.payer.name}</span> paid <span className="font-bold text-white">₹{exp.amount}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-sm font-bold text-gray-300">
                                                {new Date(exp.date).toLocaleDateString('en-IN')}
                                            </div>
                                            <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 font-semibold mt-1 inline-block">
                                                {exp.splitType}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteExpense(exp._id)}
                                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:bg-red-500/20 p-2.5 rounded-lg transition-all hover:text-red-300 font-bold text-lg"
                                            title="Delete"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main >

            {/* Add Expense Modal */}
            {
                showAddExpense && (
                    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="glass-card w-full max-w-lg p-8 rounded-2xl shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-2xl font-bold mb-6 text-white">Add Expense</h3>
                            <form onSubmit={handleAddExpense}>
                                <div className="mb-5">
                                    <label className="block text-sm font-semibold text-gray-200 mb-2">Description</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full"
                                        placeholder="Dinner, Movie, Cab..."
                                        value={expenseForm.description}
                                        onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-200 mb-2">Amount (₹)</label>
                                        <input
                                            type="number"
                                            required
                                            step="0.01"
                                            className="w-full"
                                            placeholder="0.00"
                                            value={expenseForm.amount}
                                            onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-200 mb-2">Paid By</label>
                                        <select
                                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 outline-none text-white appearance-none font-medium"
                                            value={expenseForm.payer}
                                            onChange={e => setExpenseForm({ ...expenseForm, payer: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Payer</option>
                                            {group.participants.map(p => (
                                                <option key={p.user || p._id} value={p.user || p._id} className="bg-gray-800">
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Participant Selection */}
                                <div className="mb-6 p-5 bg-white/5 rounded-xl border border-white/10">
                                    <label className="text-sm uppercase font-bold text-gray-300 mb-3 block">Split Among</label>
                                    <div className="space-y-2 mb-3">
                                        {group.participants.map(p => {
                                            const participantId = p.user || p._id;
                                            const isSelected = expenseForm.selectedParticipants.length === 0 || expenseForm.selectedParticipants.includes(participantId);
                                            return (
                                                <label
                                                    key={participantId}
                                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-purple-500/20 border border-purple-500/50' : 'bg-white/5 border border-white/10 hover:bg-white/10'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleParticipant(participantId)}
                                                        className="w-4 h-4 accent-purple-500"
                                                    />
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white">
                                                        {p.name[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-200">{p.name}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        💡 {expenseForm.selectedParticipants.length === 0 ? 'All members selected' : `${expenseForm.selectedParticipants.length} member(s) selected`}. Expense will be split equally among selected members.
                                    </p>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddExpense(false)}
                                        className="px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-gray-300 font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-500/30"
                                    >
                                        Add Expense
                                </div>
                        </div>
                        )
            }

                        {/* Add Members Modal */}
                        {showAddMembers && (
                            <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                                <div className="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl border border-white/20">
                                    <h3 className="text-2xl font-bold mb-6 text-white">Add Members to Group</h3>
                                    <form onSubmit={handleAddMembers}>
                                        <div className="mb-5">
                                            <label className="block text-sm font-semibold text-gray-200 mb-2">Member Emails</label>
                                            <input
                                                type="text"
                                                className="w-full"
                                                placeholder="alice@example.com, bob@example.com"
                                                value={addMembersForm.emails}
                                                onChange={(e) => setAddMembersForm({ ...addMembersForm, emails: e.target.value })}
                                                required
                                            />
                                            <p className="text-xs text-gray-400 mt-2">💡 Separate emails with commas. Max {4 - group.participants.length} member(s) can be added.</p>
                                        </div>

                                        <div className="mb-6 p-5 bg-white/5 rounded-xl border border-white/10">
                                            <label className="flex items-start gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={addMembersForm.includePreviousExpenses}
                                                    onChange={(e) => setAddMembersForm({ ...addMembersForm, includePreviousExpenses: e.target.checked })}
                                                    className="w-5 h-5 mt-1 accent-purple-500"
                                                />
                                                <div>
                                                    <span className="text-sm font-semibold text-gray-200 block">Include in Previous Expenses</span>
                                                    <span className="text-xs text-gray-400 block mt-1">
                                                        ⚠️ New members will be added to all existing EQUAL split expenses. Their balances will be recalculated.
                                                    </span>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setShowAddMembers(false)}
                                                className="px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-gray-300 font-semibold"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30"
                                            >
                                                Add Members
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div >
                );
}
