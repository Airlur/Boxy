import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export function LinksInput({ id, label, initialValues = [] }) {
    const [links, setLinks] = useState(initialValues.length ? initialValues : ['']);
    
    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium text-gray-500">{label}</label>
                <button type="button" onClick={() => setLinks([...links, ''])} className="text-xs text-blue-600 hover:underline flex items-center gap-1"><Plus size={12} /> 添加</button>
            </div>
            <div id={id} className="space-y-2">
                {links.map((link, idx) => (
                    <div key={idx} className="flex gap-2">
                        <input name={`${id}[]`} defaultValue={link} placeholder="https://" className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm focus:border-black outline-none" />
                        <button type="button" onClick={(e) => {
                             const newLinks = [...links];
                             newLinks.splice(idx, 1);
                             setLinks(newLinks);
                        }} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        </div>
    );
}
