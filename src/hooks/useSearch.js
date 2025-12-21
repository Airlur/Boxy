import { useState, useMemo } from 'react';

/**
 * 搜索与过滤逻辑 Hook
 * 管理当前分类、搜索关键词以及最终展示项目的计算
 * 
 * @param {Object} data - 包含 categories 的数据对象
 */
export function useSearch(data) {
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const displayedItems = useMemo(() => {
    // 确保数据存在
    if (!data || !data.categories) return [];

    let items = [];
    // 按 sort 字段对分类进行排序
    const sortedCats = [...data.categories].sort((a, b) => a.sort - b.sort);

    if (searchQuery) {
      // --- 搜索模式 ---
      const q = searchQuery.toLowerCase();
      // 如果当前选了特定分类，则只在该分类下搜，否则全搜
      const targetCats = currentCategory === 'all' 
        ? sortedCats 
        : sortedCats.filter(c => c.id === currentCategory);

      targetCats.forEach(cat => {
        if (!cat.software) return;
        cat.software.forEach(soft => {
          // 匹配名称、描述或网址
          const matchName = soft.name.toLowerCase().includes(q);
          const matchDesc = soft.description && soft.description.toLowerCase().includes(q);
          const matchUrl = soft.website && soft.website.toLowerCase().includes(q);

          if (matchName || matchDesc || matchUrl) {
            // 注入所属分类信息，便于后续展示
            items.push({ ...soft, _catName: cat.name, _catId: cat.id });
          }
        });
      });
    } else if (currentCategory === 'all') {
      // --- 全部展示模式 ---
      sortedCats.forEach(cat => {
        if (!cat.software) return;
        // 分类内的软件也需要排序
        const sortedSoft = [...cat.software].sort((a, b) => a.sort - b.sort);
        sortedSoft.forEach(soft => items.push({ ...soft, _catName: cat.name, _catId: cat.id }));
      });
    } else {
      // --- 单一分类模式 ---
      const cat = data.categories.find(c => c.id === currentCategory);
      if (cat && cat.software) {
        items = [...cat.software]
          .sort((a, b) => a.sort - b.sort)
          .map(s => ({ ...s, _catName: cat.name, _catId: cat.id }));
      }
    }
    return items;
  }, [data, currentCategory, searchQuery]);

  return {
    currentCategory,
    setCurrentCategory,
    searchQuery,
    setSearchQuery,
    displayedItems
  };
}
