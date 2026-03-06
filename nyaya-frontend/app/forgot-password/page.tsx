'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Scale, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulaton of sending a reset email
        // In a real app, this would be an API call to the backend
        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
        }, 1500);
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'radial-gradient(ellipse at top, rgba(201,162,39,0.06) 0%, transparent 50%)' }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '420px', padding: '40px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #C9A227, #E0C56E)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Scale size={30} color="#0E0E10" strokeWidth={2.5} />
                    </div>
                    <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: '#F1E8D8', marginBottom: '6px' }}>Reset Password</h1>
                    <p style={{ color: '#9E9689', fontSize: '0.9rem' }}>Enter your email to receive a reset link</p>
                </div>

                {success ? (
                    <div style={{ textAlign: 'center', padding: '24px 0' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(34,197,94,0.1)', marginBottom: '16px' }}>
                            <CheckCircle size={32} color="#22c55e" />
                        </div>
                        <h2 style={{ color: '#F1E8D8', fontSize: '1.2rem', fontWeight: '600', marginBottom: '8px' }}>Check your email</h2>
                        <p style={{ color: '#9E9689', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
                            We have sent a password reset link to <strong>{email}</strong>. Please check your inbox and spam folder.
                        </p>
                        <Link href="/login" style={{ display: 'inline-block', width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: '#F1E8D8', textDecoration: 'none', fontWeight: '500', border: '1px solid rgba(255,255,255,0.1)' }}>
                            Back to Sign In
                        </Link>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', fontSize: '0.82rem', color: '#D4CCBE', marginBottom: '6px', fontWeight: '500' }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} color="#9E9689" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                                    className="input-field" placeholder="you@example.com" style={{ paddingLeft: '40px' }} />
                            </div>
                        </div>

                        <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', fontSize: '0.95rem', padding: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: loading ? 0.7 : 1 }}>
                            {loading ? <><div className="loading-spinner" style={{ width: '16px', height: '16px' }} /> Sending link...</> : 'Send Reset Link'}
                        </button>

                        <div style={{ marginTop: '24px', textAlign: 'center' }}>
                            <Link href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#9E9689', fontSize: '0.87rem', textDecoration: 'none', fontWeight: '500' }}>
                                <ArrowLeft size={14} /> Back to Sign In
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
