import React, { useState } from 'react';
import { X, RotateCw, Link } from 'lucide-react';
import Turnstile from 'react-turnstile';

export function ShareAllModal({ data, onClose, showToast }) {
    const [loading, setLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [token, setToken] = useState(null);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        showToast('链接已复制到剪贴板');
    };

    const simpleHash = str => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash &= hash;
        }
        return new Uint32Array([hash])[0].toString(36);
    };

    const generateLink = async () => {
        if (!token) return;
        setLoading(true);
        try {
            // Remove updatedAt for stable hash
            const { updatedAt, ...cleanData } = data;
            const content = JSON.stringify(cleanData, null, 2);
            const contentHash = simpleHash(content);

            const cacheKey = 'boxy_share_cache';
            const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');

            if (cache[contentHash]) {
                const link = `${window.location.origin}/?share=${cache[contentHash]}`;
                setShareUrl(link);
                handleCopy(link);
                setLoading(false);
                return;
            }

            const res = await fetch('/api/gist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    description: 'Boxy Library Share',
                    token: token
                })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);

            cache[contentHash] = result.id;
            localStorage.setItem(cacheKey, JSON.stringify(cache));

            const link = `${window.location.origin}/?share=${result.id}`;
            setShareUrl(link);
            handleCopy(link);
        } catch (e) {
            console.error(e);
            showToast(`生成失败: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 relative z-10 animate-modal-in p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">分享整个库</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button>
                </div>

                <div className="mb-6 text-sm text-gray-500">
                    将生成当前所有数据的快照链接 (Gist)。<br/>
                    为了防止滥用，请先完成验证。
                </div>

                <div className="space-y-4">
                    {!shareUrl && (
                        <div className="flex justify-center">
                            {import.meta.env.DEV ? (
                                <button onClick={() => setToken('mock-turnstile-token')} className="px-4 py-2 bg-gray-200 rounded text-xs text-gray-600 hover:bg-gray-300">
                                    [Dev] 点击模拟验证码通过
                                </button>
                            ) : (
                                <Turnstile 
                                    sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY} 
                                    onVerify={setToken}
                                />
                            )}
                        </div>
                    )}

                    <button onClick={generateLink} disabled={loading || !token} className="w-full flex items-center justify-center gap-2 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <RotateCw size={16} className="animate-spin"/> : <Link size={16}/>}
                        {shareUrl ? '链接已生成 (点击复制)' : (token ? '生成链接' : '请先完成验证')}
                    </button>

                    {shareUrl && (
                        <input 
                            readOnly 
                            value={shareUrl} 
                            onClick={(e) => { e.target.select(); handleCopy(shareUrl); }}
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600 outline-none text-center"
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
