'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function RegisterPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            login(data.data, data.token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 rounded-2xl animate-fade-in shadow-glow">
                <div className="text-center mb-8">
                    <h2 className="text-4xl font-bold mb-2 text-gradient">Join SplitMint</h2>
                    <p className="text-gray-300 text-sm">Create your account and start splitting!</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border-2 border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm font-medium">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-2">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full"
                            placeholder="John Doe"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full"
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-200 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/30 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                    >
                        {loading ? '🔄 Creating Account...' : '✨ Get Started'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-300 text-sm">
                        Already have an account?{' '}
                        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-bold underline underline-offset-2">
                            Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
