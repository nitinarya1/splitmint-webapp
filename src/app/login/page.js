'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function LoginPage() {
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
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Login failed');
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
                    <h2 className="text-4xl font-bold mb-2 text-gradient">Welcome Back!</h2>
                    <p className="text-gray-300 text-sm">Sign in to SplitMint</p>
                </div>

                {error && (
                    <div className="bg-red-500/20 border-2 border-red-500/50 text-red-200 p-4 rounded-xl mb-6 text-sm font-medium">
                        ⚠️ {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
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
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-500/30 transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                    >
                        {loading ? '🔄 Signing in...' : '🚀 Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-300 text-sm">
                        Don't have an account?{' '}
                        <Link href="/register" className="text-purple-400 hover:text-purple-300 font-bold underline underline-offset-2">
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
