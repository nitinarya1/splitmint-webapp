'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Dashboard() {
    const { user, logout } = useAuth();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create Group Form State
    const [newGroupName, setNewGroupName] = useState('');
    const [participants, setParticipants] = useState(''); // Comma separated emails

    useEffect(() => {
        fetchGroups();
    }, [user]);

    const fetchGroups = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch('/api/groups', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setGroups(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch groups', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        const participantList = participants.split(',').map(email => ({ email: email.trim() })).filter(p => p.email);

        try {
            const res = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newGroupName,
                    participants: participantList
                })
            });

            const data = await res.json();
            if (data.success) {
                setShowCreateModal(false);
                setNewGroupName('');
                setParticipants('');
                fetchGroups();
            } else {
                alert(data.error);
            }
        } catch (error) {
            alert('Failed to create group');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-300 text-lg animate-pulse">Loading your groups...</div>;

    return (
        <div className="min-h-screen pb-20">
            {/* Header */}
            <nav className="glass border-b border-white/20 p-4 sticky top-0 z-10 backdrop-blur-xl">
                <div className="container mx-auto flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gradient">💰 SplitMint</h1>
                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                                {user?.name[0]?.toUpperCase()}
                            </div>
                            <span className="text-sm font-semibold text-gray-200">{user?.name}</span>
                        </div>
                        <button
                            onClick={logout}
                            className="text-sm bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-200 px-4 py-2 rounded-full transition-all font-semibold"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="container mx-auto p-4 py-8">

                {/* Actions */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Your Groups</h2>
                        <p className="text-gray-400 text-sm">Manage your expense groups</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all text-sm"
                    >
                        ✨ Create Group
                    </button>
                </div>

                {/* Groups Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.length === 0 ? (
                        <div className="col-span-full text-center py-20 glass-card rounded-2xl border-dashed border-2">
                            <div className="text-6xl mb-4">📊</div>
                            <p className="text-gray-300 font-semibold mb-2">No groups yet!</p>
                            <p className="text-gray-400 text-sm mb-4">Create your first group to start tracking expenses</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 text-purple-400 hover:text-purple-300 font-bold underline underline-offset-4"
                            >
                                Create one now →
                            </button>
                        </div>
                    ) : (
                        groups.map(group => (
                            <Link href={`/groups/${group._id}`} key={group._id}>
                                <div className="glass-card p-6 rounded-2xl hover:scale-[1.02] transition-all cursor-pointer group h-full flex flex-col justify-between border border-white/10 hover:border-purple-500/50">
                                    <div>
                                        <div className="flex items-start justify-between mb-3">
                                            <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">{group.name}</h3>
                                            <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-1 rounded-full font-semibold">
                                                {group.participants.length} members
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400 line-clamp-2">{group.description || 'No description added'}</p>
                                    </div>
                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex -space-x-3">
                                            {group.participants.slice(0, 4).map((p, i) => (
                                                <div
                                                    key={i}
                                                    className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 border-3 border-gray-900 flex items-center justify-center text-sm font-bold text-white shadow-lg"
                                                    title={p.name}
                                                >
                                                    {p.name[0]?.toUpperCase()}
                                                </div>
                                            ))}
                                            {group.participants.length > 4 && (
                                                <div className="w-10 h-10 rounded-full bg-gray-700 border-3 border-gray-900 flex items-center justify-center text-xs font-bold text-gray-300 shadow-lg">
                                                    +{group.participants.length - 4}
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-purple-400 group-hover:translate-x-1 transition-transform">
                                            →
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </main>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card w-full max-w-md p-8 rounded-2xl shadow-2xl border border-white/20">
                        <h3 className="text-2xl font-bold mb-6 text-white">Create New Group</h3>
                        <form onSubmit={handleCreateGroup}>
                            <div className="mb-5">
                                <label className="block text-sm font-semibold text-gray-200 mb-2">Group Name</label>
                                <input
                                    type="text"
                                    className="w-full"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    required
                                    placeholder="e.g. Summer Trip, Office Lunch"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-200 mb-2">Participants (Emails)</label>
                                <input
                                    type="text"
                                    className="w-full"
                                    value={participants}
                                    onChange={(e) => setParticipants(e.target.value)}
                                    placeholder="alice@example.com, bob@example.com"
                                />
                                <p className="text-xs text-gray-400 mt-2">💡 Separate emails with commas. They must be registered users.</p>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-5 py-2.5 rounded-xl hover:bg-white/10 transition-colors text-gray-300 font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-purple-500/30"
                                >
                                    Create Group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
