'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useAuth, API_URL } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Send, Mic, MicOff, Plus, MessageSquare, Trash2, Scale, AlertTriangle, Paperclip, X, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message { role: 'user' | 'ai'; content: string; timestamp: Date; fileName?: string; }
interface Session { id: string; _id?: string; title: string; category: string; messages?: Message[]; }

// Format structured AI legal response (new 5-section format)
function LegalResponseCard({ content }: { content: string }) {
    const sections = [
        { key: '1. Relevant Indian Laws', label: 'Relevant Indian Laws (BNS 2023)', color: '#C9A227', icon: '⚖️' },
        { key: '2. Immediate Legal', label: 'Immediate Legal & Technical Steps', color: '#34d399', icon: '🚀' },
        { key: '3. Summary Table', label: 'Summary Table', color: '#a78bfa', icon: '📋' },
        // Also try more specific section headers
        { key: '2. Legal Explanation', label: 'Legal Explanation', color: '#60a5fa', icon: '📖' },
        { key: '3. Immediate Legal Steps', label: 'Immediate Legal Steps', color: '#34d399', icon: '🚀' },
        { key: '4. Technical or Safety Steps', label: 'Technical / Safety Steps', color: '#f472b6', icon: '🔐' },
        { key: '5. Summary Table', label: 'Summary Table', color: '#a78bfa', icon: '📋' },
    ];

    // Also handle the old format
    const oldSections = [
        { key: '**Issue Identified:**', label: 'Issue Identified', color: '#C9A227' },
        { key: '**Case Category:**', label: 'Case Category', color: '#60a5fa' },
        { key: '**Applicable Law:**', label: 'Applicable Law', color: '#f472b6' },
        { key: '**Explanation (Simple Language):**', label: 'Simple Explanation', color: '#34d399' },
        { key: '**Explanation (Legal Terms):**', label: 'Legal Terms', color: '#a78bfa' },
        { key: '**Possible Penalties or Rights:**', label: 'Penalties / Rights', color: '#fb923c' },
        { key: '**Immediate Actions You Should Take:**', label: 'Immediate Actions', color: '#4ade80' },
        { key: '**When to Contact Police or Lawyer:**', label: 'When to Contact', color: '#fbbf24' },
    ];

    // Try new format first
    const parsed: { label: string; color: string; text: string; icon?: string }[] = [];

    for (let i = 0; i < sections.length; i++) {
        const cur = sections[i];
        const next = sections[i + 1];
        const startIdx = content.indexOf(cur.key);
        if (startIdx === -1) continue;
        const afterKey = content.indexOf('\n', startIdx);
        if (afterKey === -1) continue;
        const endIdx = next ? content.indexOf(next.key) : content.length;
        const text = content.substring(afterKey + 1, endIdx > -1 ? endIdx : undefined).trim();
        if (text) parsed.push({ label: cur.label, color: cur.color, text, icon: cur.icon });
    }

    // If new format didn't work, try old format
    if (parsed.length === 0) {
        for (let i = 0; i < oldSections.length; i++) {
            const cur = oldSections[i];
            const next = oldSections[i + 1];
            const startIdx = content.indexOf(cur.key);
            if (startIdx === -1) continue;
            const afterKey = content.indexOf('\n', startIdx) + 1;
            const endIdx = next ? content.indexOf(next.key) : -1;
            const text = (endIdx > -1 ? content.substring(afterKey, endIdx) : content.substring(afterKey)).trim();
            if (text) parsed.push({ label: cur.label, color: cur.color, text });
        }
    }

    // Extract disclaimer
    const disclaimerMatch = content.match(/\*Disclaimer:[\s\S]*?\*/) || content.match(/Disclaimer:.*/);
    const disclaimer = disclaimerMatch ? disclaimerMatch[0].replace(/\*/g, '') : '';

    if (parsed.length === 0) {
        // Fallback: render with ReactMarkdown
        return (
            <div className="markdown-content">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {parsed.map(({ label, color, text, icon }) => (
                <div key={label} style={{ borderLeft: `3px solid ${color}`, paddingLeft: '12px', paddingTop: '6px', paddingBottom: '6px', background: `${color}08`, borderRadius: '0 6px 6px 0' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {icon && <span style={{ fontSize: '0.85rem' }}>{icon}</span>}
                        {label}
                    </div>
                    <div className="markdown-content" style={{ fontSize: '0.87rem', color: '#D4CCBE', lineHeight: '1.7' }}>
                        <ReactMarkdown>{text.trim()}</ReactMarkdown>
                    </div>
                </div>
            ))}
            {disclaimer && (
                <div style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '6px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <AlertTriangle size={14} color="#fbbf24" style={{ flexShrink: 0, marginTop: '1px' }} />
                    <span style={{ fontSize: '0.75rem', color: '#D4CCBE', fontStyle: 'italic' }}>{disclaimer.trim()}</span>
                </div>
            )}
        </div>
    );
}

function ChatContent() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [currentSession, setCurrentSession] = useState<string | null>(null);
    const [listening, setListening] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchSessions = useCallback(async () => {
        try {
            const res = await axios.get(`${API_URL}/api/chat/sessions`);
            setSessions(res.data);
        } catch (e) { }
    }, []);

    useEffect(() => {
        if (isLoading) return;
        if (!user) { router.push('/login'); return; }
        fetchSessions();
    }, [user, isLoading, router, fetchSessions]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Welcome message
    useEffect(() => {
        if (user && messages.length === 0 && !currentSession) {
            setMessages([{
                role: 'ai',
                content: `## Welcome to NyayaAI! ⚖️

I am your **AI-powered legal guidance assistant**, trained on Indian law. I can help you with:

- 🔍 **Legal Questions** — Ask about any legal situation in English or Hindi
- 📄 **Document Analysis** — Upload PDFs, images, or text files for legal review
- 📋 **Structured Guidance** —  I provide applicable laws, steps to take, and safety tips

### How to use:
1. Type your legal question below
2. Optionally attach a document using the 📎 button
3. I'll provide structured legal guidance with relevant Indian laws

> *Disclaimer: This is legal guidance information, not a substitute for professional legal advice.*`,
                timestamp: new Date()
            }]);
        }
    }, [user, messages.length, currentSession]);

    const sendMessage = async () => {
        if ((!input.trim() && !selectedFile) || loading) return;

        const userMsg: Message = {
            role: 'user',
            content: input + (selectedFile ? `\n\n📎 ${selectedFile.name}` : ''),
            timestamp: new Date(),
            fileName: selectedFile?.name
        };
        setMessages(prev => [...prev, userMsg]);
        const query = input;
        const file = selectedFile;
        setInput('');
        setSelectedFile(null);
        setLoading(true);

        try {
            let res;
            if (file) {
                // Send as FormData with file
                const formData = new FormData();
                formData.append('message', query || `Please analyze this document: ${file.name}`);
                if (currentSession) formData.append('sessionId', currentSession);
                formData.append('file', file);
                res = await axios.post(`${API_URL}/api/chat/message`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    timeout: 120000,
                });
            } else {
                res = await axios.post(`${API_URL}/api/chat/message`, {
                    message: query,
                    sessionId: currentSession
                }, { timeout: 120000 });
            }

            const aiMsg: Message = { role: 'ai', content: res.data.message.content, timestamp: new Date() };
            setMessages(prev => [...prev, aiMsg]);
            if (!currentSession) setCurrentSession(res.data.sessionId);
            fetchSessions();
        } catch (err: any) {
            console.error('Chat error full:', err);
            const serverError = err.response?.data?.error;
            const exactError = err.message ? `(${err.message} - ${err.code || 'No Code'})` : '';
            const explanation = serverError || `Could not reach the server. ${exactError}`;
            const errMsg: Message = {
                role: 'ai',
                content: `## ⚠️ Request Error\n\n${explanation}\n\n> *Please try again or check your backend logs for more details.*`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errMsg]);
        } finally {
            setLoading(false);
        }
    };

    const loadSession = async (session: Session) => {
        const sid = session._id || session.id;
        try {
            const res = await axios.get(`${API_URL}/api/chat/session/${sid}`);
            setMessages(res.data.messages || []);
            setCurrentSession(sid);
        } catch (e) { }
    };

    const deleteSession = async (e: React.MouseEvent, session: Session) => {
        e.stopPropagation();
        const sid = session._id || session.id;
        try {
            await axios.delete(`${API_URL}/api/chat/session/${sid}`);
            setSessions(prev => prev.filter(s => (s._id || s.id) !== sid));
            if (currentSession === sid) { setCurrentSession(null); setMessages([]); }
        } catch (e) { }
    };

    const newChat = () => {
        setCurrentSession(null);
        setMessages([]);
        setSelectedFile(null);
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) validateAndSetFile(file);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) validateAndSetFile(file);
        if (e.target) e.target.value = '';
    };

    const validateAndSetFile = (file: File) => {
        const allowed = ['application/pdf', 'text/plain', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
        if (!allowed.includes(file.type) && !file.type.startsWith('image/')) {
            alert('Unsupported file type. Please upload PDF, image, or text files.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('File too large. Maximum size is 10MB.');
            return;
        }
        setSelectedFile(file);
    };

    const toggleVoice = () => {
        if (listening) {
            recognitionRef.current?.stop();
            setListening(false);
        } else {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) { alert('Speech recognition not supported in this browser. Try Chrome.'); return; }
            const recognition = new SpeechRecognition();
            recognition.lang = 'en-IN';
            recognition.interimResults = false;
            recognition.onresult = (e: any) => {
                const transcript = e.results[0][0].transcript;
                setInput(prev => prev + transcript);
                setListening(false);
            };
            recognition.onerror = () => setListening(false);
            recognition.onend = () => setListening(false);
            recognition.start();
            recognitionRef.current = recognition;
            setListening(true);
        }
    };

    return (
        <div
            style={{ display: 'flex', height: '100vh', paddingTop: '64px' }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
        >
            {/* Drag overlay */}
            {dragOver && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 50,
                    background: 'rgba(201,162,39,0.1)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px dashed #C9A227', borderRadius: '16px', margin: '80px 20px 20px',
                    pointerEvents: 'none'
                }}>
                    <div style={{ textAlign: 'center', color: '#C9A227' }}>
                        <FileText size={48} style={{ margin: '0 auto 12px' }} />
                        <div style={{ fontSize: '1.2rem', fontWeight: '700' }}>Drop your file here</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>PDF, Image, or Text file</div>
                    </div>
                </div>
            )}

            {/* Sidebar */}
            <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} style={{ paddingTop: '16px', display: sidebarOpen ? 'flex' : 'none', flexDirection: 'column' }}>
                <div style={{ padding: '0 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={newChat} className="btn-primary" style={{ width: '100%', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem' }}>
                        <Plus size={16} /> New Legal Query
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', letterSpacing: '1px', color: '#9E9689', padding: '0 8px', marginBottom: '8px', textTransform: 'uppercase' }}>Recent Queries</div>
                    {sessions.length === 0 && <p style={{ color: '#9E9689', fontSize: '0.8rem', padding: '8px', textAlign: 'center' }}>No history yet</p>}
                    {sessions.map(session => {
                        const sid = session._id || session.id;
                        return (
                            <div key={sid} onClick={() => loadSession(session)} style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 10px',
                                borderRadius: '8px', marginBottom: '2px', cursor: 'pointer',
                                background: currentSession === sid ? 'rgba(201,162,39,0.1)' : 'transparent',
                                border: currentSession === sid ? '1px solid rgba(201,162,39,0.2)' : '1px solid transparent',
                                transition: 'all 0.15s ease'
                            }}
                                onMouseEnter={e => { if (currentSession !== sid) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                onMouseLeave={e => { if (currentSession !== sid) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A227', flexShrink: 0 }} />
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '0.8rem', color: '#D4CCBE', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</div>
                                    <div style={{ fontSize: '0.65rem', color: '#9E9689' }}>{session.category}</div>
                                </div>
                                <button onClick={e => deleteSession(e, session)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9689', padding: '2px', opacity: 0.5 }}
                                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.5'}>
                                    <Trash2 size={13} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main chat */}
            <div style={{ flex: 1, marginLeft: sidebarOpen ? '260px' : '0', display: 'flex', flexDirection: 'column', transition: 'margin 0.3s ease' }} className="main-with-sidebar">
                {/* Chat header */}
                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(14,14,16,0.8)', backdropFilter: 'blur(8px)' }}>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9689', padding: '4px' }}>
                        <MessageSquare size={18} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Scale size={18} color="#C9A227" />
                        <span style={{ fontWeight: '700', color: '#F1E8D8', fontSize: '0.95rem' }}>NyayaAI Legal Chat</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: '#9E9689', marginLeft: 'auto' }}>AI-Powered · Supports file uploads</span>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeInUp 0.3s ease' }}>
                            {msg.role === 'user' ? (
                                <div className="chat-message-user">
                                    {msg.content}
                                </div>
                            ) : (
                                <div className="chat-message-ai" style={{ width: '100%', maxWidth: '100%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid rgba(201,162,39,0.15)' }}>
                                        <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg, #C9A227, #E0C56E)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            <Scale size={13} color="#0E0E10" />
                                        </div>
                                        <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#C9A227', letterSpacing: '0.5px' }}>NYAYAAI LEGAL GUIDANCE</span>
                                    </div>
                                    <LegalResponseCard content={msg.content} />
                                </div>
                            )}
                            <span style={{ fontSize: '0.68rem', color: '#9E9689', marginTop: '4px' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}

                    {loading && (
                        <div className="chat-message-ai" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="loading-spinner" />
                            <span style={{ fontSize: '0.85rem', color: '#9E9689' }}>Analyzing your legal query...</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* File preview */}
                {selectedFile && (
                    <div style={{ padding: '8px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(201,162,39,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '900px', margin: '0 auto' }}>
                            <FileText size={16} color="#C9A227" />
                            <span style={{ fontSize: '0.82rem', color: '#D4CCBE', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                            </span>
                            <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9689', padding: '2px' }}>
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Input area */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(14,14,16,0.95)' }}>
                    <div style={{ display: 'flex', gap: '10px', maxWidth: '900px', margin: '0 auto' }}>
                        {/* File upload button */}
                        <button onClick={() => fileInputRef.current?.click()} style={{
                            width: '44px', height: '44px', borderRadius: '10px',
                            border: selectedFile ? '1px solid #C9A227' : '1px solid rgba(255,255,255,0.1)',
                            background: selectedFile ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.04)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            color: selectedFile ? '#C9A227' : '#9E9689', transition: 'all 0.2s ease'
                        }}>
                            <Paperclip size={18} />
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.txt,.png,.jpg,.jpeg,.webp,image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileSelect}
                        />

                        {/* Voice button */}
                        <button onClick={toggleVoice} style={{
                            width: '44px', height: '44px', borderRadius: '10px', border: `1px solid ${listening ? '#C9A227' : 'rgba(255,255,255,0.1)'}`,
                            background: listening ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.04)',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            color: listening ? '#C9A227' : '#9E9689', animation: listening ? 'pulse-gold 1.5s infinite' : 'none'
                        }}>
                            {listening ? <Mic size={18} /> : <MicOff size={18} />}
                        </button>

                        <textarea value={input} onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder={selectedFile ? `Ask about ${selectedFile.name}...` : "Describe your legal situation... (e.g., 'My landlord is refusing to return my deposit')"}
                            className="input-field" rows={1} style={{ flex: 1, resize: 'none', minHeight: '44px', maxHeight: '120px', lineHeight: '1.5', paddingTop: '11px' }}
                        />

                        <button onClick={sendMessage} disabled={(!input.trim() && !selectedFile) || loading} className="btn-primary" style={{
                            width: '44px', height: '44px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', flexShrink: 0,
                            opacity: (!input.trim() && !selectedFile) || loading ? 0.5 : 1
                        }}>
                            <Send size={18} />
                        </button>
                    </div>
                    <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#9E9689', marginTop: '8px' }}>
                        Enter to send · Shift+Enter for new line · 📎 Attach files · 🎤 Voice input
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ChatPage() {
    return <><Navbar /><ChatContent /></>;
}
