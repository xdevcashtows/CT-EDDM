const STORAGE_KEY = 'ct-eddm-mock-layouts';

const DEFAULT_LAYOUTS = {
  '9x12': {
    front: { small: 4, medium: 3, large: 2 },
    back: { small: 3, medium: 3, large: 2 }
  },
  '6x12': {
    front: { small: 3, medium: 2, large: 2 },
    back: { small: 2, medium: 2, large: 1 }
  }
};

const cloneLayout = (layout) => ({
  front: { ...layout.front },
  back: { ...layout.back }
});

const readStoredLayouts = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeStoredLayouts = (layouts) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
};

export const getDefaultMockLayout = (cardSize = '9x12') => {
  const template = DEFAULT_LAYOUTS[cardSize] || DEFAULT_LAYOUTS['9x12'];
  return cloneLayout(template);
};

export const getMockLayoutForDesign = (designId, cardSize = '9x12') => {
  if (!designId) {
    return getDefaultMockLayout(cardSize);
  }
  const stored = readStoredLayouts();
  const storedLayout = stored[designId];
  if (storedLayout && storedLayout.front && storedLayout.back) {
    return cloneLayout(storedLayout);
  }
  return getDefaultMockLayout(cardSize);
};

export const saveMockLayoutForDesign = (designId, layout) => {
  if (!designId || !layout || !layout.front || !layout.back) return;
  const stored = readStoredLayouts();
  stored[designId] = cloneLayout(layout);
  writeStoredLayouts(stored);
};

