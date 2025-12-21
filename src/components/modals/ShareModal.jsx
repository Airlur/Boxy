import React, { useState } from 'react';
import { X, Copy, Link, FileJson } from 'lucide-react';
import Turnstile from 'react-turnstile';

export function ShareModal({ soft, onClose, showToast }) {
    const [loading, setLoading] = useState(false);
    const [shareUrl, setShareUrl] = useState('');
    const [token, setToken] = useState(null);

    const handleCopy = (text, type) => {
        navigator.clipboard.writeText(text);
        showToast(`已复制 ${type}`);
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
            // 保留原始分类，移除 updatedAt 以保持 Hash 稳定
            const payload = {
                categories: [{
                    id: soft._catId || 'share_default',
                    name: soft._catName || '分享软件',
                    sort: 0,
                    software: [soft]
                }]
            };

            const content = JSON.stringify(payload, null, 2);
            const contentHash = simpleHash(content);
            
            // 检查本地缓存
            const cacheKey = 'boxy_share_cache';
            const cache = JSON.parse(localStorage.getItem(cacheKey) || '{}');
            
            if (cache[contentHash]) {
                const link = `${window.location.origin}/?share=${cache[contentHash]}`;
                setShareUrl(link);
                handleCopy(link, '分享链接 (来自缓存)');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/gist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    description: `Boxy Share: ${soft.name}`,
                    token: token
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // 更新缓存
            cache[contentHash] = data.id;
            localStorage.setItem(cacheKey, JSON.stringify(cache));

            const link = `${window.location.origin}/?share=${data.id}`;
            setShareUrl(link);
            handleCopy(link, '分享链接');
        } catch (e) {
            console.error(e);
            showToast(`生成失败: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const textShare = `推荐软件：${soft.name}\n官网：${soft.website || '无'}\n${soft.description || ''}`;
    const jsonShare = JSON.stringify(soft, null, 2);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dialog-backdrop" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 relative z-10 animate-modal-in p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">分享软件</h3>
                    <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-black"/></button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6 flex items-start gap-3">
                    <div className="w-10 h-10 rounded bg-white border border-gray-200 flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
                        {(() => {
                            const domain = (() => {
                                try { if (soft.website) return new URL(soft.website).hostname; } catch(e){}
                                if (!domain && soft.downloadUrls?.[0]) try { return new URL(soft.downloadUrls[0]).hostname; } catch(e){}
                                return '';
                            })();
                            
                            const proxyUrl = domain ? `/api/favicon?domain=${domain}` : null;
                            const googleUrl = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
                            const initialSrc = soft.iconUrl || proxyUrl;
                            const firstChar = soft.name.charAt(0).toUpperCase();

                            return initialSrc ? (
                                <img 
                                    src={initialSrc} 
                                    className="w-full h-full object-contain p-1" 
                                    onError={(e) => {
                                        if (soft.iconUrl && e.target.src.includes(soft.iconUrl) && proxyUrl) {
                                            e.target.src = proxyUrl;
                                            return;
                                        }
                                        if (e.target.src.includes('/api/favicon') && googleUrl) {
                                            e.target.src = googleUrl;
                                            return;
                                        }
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerText = firstChar;
                                    }}
                                />
                            ) : firstChar;
                        })()}
                    </div>
                    <div>
                        <div className="font-bold">{soft.name}</div>
                        <div className="text-xs text-gray-500 line-clamp-2">{soft.description}</div>
                    </div>
                </div>

                <div className="space-y-3">
                    {!shareUrl && (
                        <div className="flex justify-center my-2">
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
                        {shareUrl ? '链接已生成 (点击复制)' : (token ? '生成分享链接' : '请先完成验证')}
                    </button>
                    
                    {shareUrl && (
                        <input 
                            readOnly 
                            value={shareUrl} 
                            onClick={(e) => { e.target.select(); handleCopy(shareUrl, '链接'); }}
                            className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600 outline-none text-center"
                        />
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => handleCopy(textShare, '推荐语')} className="flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                            <Copy size={14}/> 复制推荐语
                        </button>
                        <button onClick={() => handleCopy(jsonShare, 'JSON')} className="flex items-center justify-center gap-2 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors">
                            <FileJson size={14}/> 复制 JSON
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Helper icon
function RotateCw({size, className}) {
    return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>;
}
