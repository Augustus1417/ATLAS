// New simplified builder service for handling recommendations
// This replaces the complex applyRecommendations logic with a much simpler, more robust approach

export function createAutoSelectHelper(mockCatalog) {
  // Simple flexible matching that's more forgiving
  function scoreMatch(catalogName, recommendationName) {
    if (!catalogName || !recommendationName) return 0;
    
    const cat = String(catalogName).toLowerCase().trim();
    const rec = String(recommendationName).toLowerCase().trim();
    
    // Exact match
    if (cat === rec) return 100;
    
    // One contains the other (for partial matches like "i9-14900K" vs "Intel Core i9-14900K")
    if (cat.includes(rec) || rec.includes(cat)) return 75;
    
    // Both contain a common substring
    const catWords = cat.split(/[\s\-]+/).filter(w => w.length > 2);
    const recWords = rec.split(/[\s\-]+/).filter(w => w.length > 2);
    
    let matching = 0;
    for (const catWord of catWords) {
      for (const recWord of recWords) {
        if (catWord === recWord) matching++;
      }
    }
    
    if (matching > 0) return 50 * matching;
    
    return 0;
  }

  function findBestMatch(catalog, recommendedPart) {
    if (!catalog || !recommendedPart) return null;
    
    const recName = recommendedPart.name || recommendedPart.title || '';
    const recCategory = recommendedPart.category || recommendedPart.kind || '';
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const catalogPart of catalog) {
      const score = scoreMatch(catalogPart.name, recName);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = catalogPart;
      }
    }
    
    // Only return a match if we have at least a partial match (50+ score)
    // or if it's the only part in the catalog
    if (bestScore >= 50 || catalog.length === 1) {
      return bestMatch;
    }
    
    return null;
  }

  function getRecommendationsByCategory(recommendedParts) {
    const map = {};
    
    if (!Array.isArray(recommendedParts)) {
      return map;
    }
    
    for (const part of recommendedParts) {
      const category = part.category || part.kind || 'Unknown';
      if (!map[category]) {
        map[category] = [];
      }
      map[category].push(part);
    }
    
    return map;
  }

  function selectRecommendedParts(recsByCategory, pickPartFn) {
    const results = {
      successful: [],
      failed: [],
      skipped: [],
    };
    
    // Priority order for auto-selection
    const priority = ['CPU', 'RAM', 'Storage', 'GPU', 'PSU', 'Cooling', 'Fans'];
    
    for (const categoryName of priority) {
      const recParts = recsByCategory[categoryName];
      if (!recParts) continue;
      
      // Take first recommendation for each category
      const recPart = recParts[0];
      
      // Find matching part in catalog
      const catalogParts = mockCatalog[categoryName.toLowerCase()] || 
                          mockCatalog[categoryName] ||
                          [];
      
      if (catalogParts.length === 0) {
        results.skipped.push({ category: categoryName, reason: 'No catalog entries' });
        continue;
      }
      
      const matchedPart = findBestMatch(catalogParts, recPart);
      
      if (matchedPart) {
        try {
          pickPartFn(matchedPart);
          results.successful.push({ category: categoryName, name: matchedPart.name });
        } catch (error) {
          results.failed.push({ category: categoryName, error: error.message });
        }
      } else {
        results.skipped.push({ category: categoryName, reason: 'No matching part found' });
      }
    }
    
    return results;
  }

  return {
    scoreMatch,
    findBestMatch,
    getRecommendationsByCategory,
    selectRecommendedParts,
  };
}
