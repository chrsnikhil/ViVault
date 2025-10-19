// Mock implementation of brotli for browser compatibility
// This provides the minimal interface needed by the Uniswap smart order router

export const compress = (data) => {
  // Return the data as-is since we don't need actual compression in the browser
  return data;
};

export const decompress = (data) => {
  // Return the data as-is since we don't need actual decompression in the browser
  return data;
};

// Default export
export default {
  compress,
  decompress,
};
