// ============================================
// Format File Size — Bytes to Human-Readable
// ============================================
// Converts raw byte counts into readable strings:
//   0          → "0 Bytes"
//   1024       → "1 KB"
//   1548276    → "1.48 MB"
//   1073741824 → "1 GB"
//
// This is a "pure function" — it always returns the same output for
// the same input, with no side effects. Pure functions are easy to
// test and reason about.
//
// HOW IT WORKS:
//
// File sizes use powers of 1024 (not 1000):
//   1 KB = 1024 bytes
//   1 MB = 1024 KB = 1,048,576 bytes
//   1 GB = 1024 MB = 1,073,741,824 bytes
//
// We use Math.log() to figure out which "tier" the number falls into:
//   Math.log(1024) / Math.log(1024) = 1  → KB
//   Math.log(1048576) / Math.log(1024) = 2  → MB
//   Math.log(1073741824) / Math.log(1024) = 3  → GB
//
// Math.floor() rounds down to get the index into our units array.

export function formatFileSize(bytes) {
  // Handle edge case: 0 bytes
  if (bytes === 0) return '0 Bytes';

  const k = 1024; // 1 kilobyte = 1024 bytes
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];

  // Calculate which tier (0=Bytes, 1=KB, 2=MB, 3=GB)
  // Math.min ensures we don't exceed our array bounds
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    sizes.length - 1
  );

  // Divide bytes by 1024^i to get the value in the correct unit
  // .toFixed(i === 0 ? 0 : 2) — no decimals for Bytes, 2 decimals for KB/MB/GB
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(i === 0 ? 0 : 2)} ${sizes[i]}`;
}
