// Centralized color configuration for nodes
// To add new colors, simply add entries to this array

export const NODE_COLORS = [
  { id: 'blue', name: 'Blue', hex: '#89b9f7ff', textColor: '#ffffff' },
  { id: 'red', name: 'Red', hex: '#f38b80ff', textColor: '#ffffff' },
  { id: 'orange', name: 'Orange', hex: '#f0a96aff', textColor: '#ffffff' },
  { id: 'yellow', name: 'Yellow', hex: '#eff160ff', textColor: '#000000' },
  { id: 'green', name: 'Green', hex: '#62db7dff', textColor: '#ffffff' },
  { id: 'purple', name: 'Purple', hex: '#c28ad8ff', textColor: '#ffffff' },
  { id: 'light-grey', name: 'Light Grey', hex: '#BDC3C7', textColor: '#000000' },
  { id: 'dark-grey', name: 'Dark Grey', hex: '#5e6768ff', textColor: '#ffffff' }
];

export const DEFAULT_COLOR = 'blue';

// Helper function to get color by id
export function getColorById(id) {
  const color = NODE_COLORS.find(c => c.id === id);
  return color || NODE_COLORS.find(c => c.id === DEFAULT_COLOR);
}

// Helper function to get color hex
export function getColorHex(id) {
  const color = getColorById(id);
  return color.hex;
}

// Helper function to get text color for a background color
export function getTextColor(id) {
  const color = getColorById(id);
  return color.textColor;
}
