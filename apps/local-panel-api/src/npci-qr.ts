/**
 * NPCI Dynamic UPI QR Code Generator (ISO/IEC 18004 + NPCI UPI Linking Specification v1.6)
 * Pure TypeScript, zero external dependencies, 100% offline/self-hosted SVG QR output.
 */

export interface NpciUpiQrParams {
  merchantVpa: string;
  merchantName: string;
  orderId: string;
  transactionNote: string;
  amountPaise: number;
  merchantCategoryCode?: string;
}

export interface NpciDynamicQrOrder {
  orderId: string;
  orderType: 'NEW_LICENSE' | 'RENEWAL';
  paymentMode?: 'UPI_QR' | 'RUPAY_CC_ON_UPI' | 'DEBIT_CARD_UPI';
  planCode: string;
  planName: string;
  billingCycle: 'MONTHLY' | 'ANNUAL';
  serverIp: string;
  customerName: string;
  customerEmail: string;
  gstin: string;
  licenseId?: string;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  amountRupees: string;
  merchantVpa: string;
  merchantName: string;
  upiUri: string;
  qrSvg: string;
  status: 'PENDING' | 'VERIFICATION_PENDING' | 'PAID' | 'EXPIRED';
  utrNumber?: string;
  claimedUtr?: string;
  verifiedVia?: 'BANK_WEBHOOK' | 'SMS_EMAIL_WEBHOOK' | 'ADMIN_APPROVED' | 'UTR_VERIFIED';
  issuedLicense?: unknown;
  issuedInvoice?: unknown;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
}

/**
 * Parses Indian Bank SMS / Email credit alerts (HDFC, ICICI, SBI, Axis, Kotak, Yes Bank, GPay/PhonePe Business)
 * to extract the credited Rupee amount, 12-digit NPCI UPI Reference (UTR/RRN), and GVORD order reference.
 */
export function parseBankUpiAlertMessage(rawText: string): {
  extractedOrderId?: string;
  extractedUtr?: string;
  extractedAmountRupees?: string;
} {
  const text = rawText.trim();
  const orderMatch = text.match(/\b(GVORD\d{6,14})\b/i);
  const utrMatch = text.match(/\b(\d{12})\b/);
  const amtMatch = text.match(/(?:Rs\.?|INR|₹)\s*([\d,]+(?:\.\d{1,2})?)/i);

  let extractedAmountRupees: string | undefined;
  if (amtMatch && amtMatch[1]) {
    const num = Number(amtMatch[1].replace(/,/g, ''));
    if (!Number.isNaN(num) && num > 0) {
      extractedAmountRupees = num.toFixed(2);
    }
  }

  return {
    extractedOrderId: orderMatch?.[1]?.toUpperCase(),
    extractedUtr: utrMatch?.[1],
    extractedAmountRupees,
  };
}

/**
 * Constructs an official NPCI UPI v1.6 Dynamic Payment Intent URI (`upi://pay?...`)
 * with locked transaction amount (`am`), order reference (`tr`), and merchant VPA (`pa`).
 */
export function buildNpciUpiUri(params: NpciUpiQrParams): string {
  const vpa = params.merchantVpa.trim();
  const pn = encodeURIComponent(params.merchantName.trim().slice(0, 50));
  const tr = encodeURIComponent(params.orderId.trim());
  const tn = encodeURIComponent(params.transactionNote.trim().slice(0, 80));
  const am = (params.amountPaise / 100).toFixed(2);
  const mc = encodeURIComponent(params.merchantCategoryCode ?? '5734');
  return `upi://pay?pa=${vpa}&pn=${pn}&tr=${tr}&tn=${tn}&am=${am}&cu=INR&mc=${mc}`;
}

// ============================================================================
// ISO/IEC 18004 Standard QR Code Encoder (Versions 1–10, ECC Level L, Byte Mode)
// ============================================================================

interface VersionSpec {
  version: number;
  totalDataCodewords: number;
  ecCodewordsPerBlock: number;
  numBlocksGroup1: number;
  dataCodewordsGroup1: number;
  numBlocksGroup2: number;
  dataCodewordsGroup2: number;
  alignmentCoords: number[];
}

const VERSION_SPECS_L: VersionSpec[] = [
  // Version 1 (21x21)
  { version: 1, totalDataCodewords: 19, ecCodewordsPerBlock: 7, numBlocksGroup1: 1, dataCodewordsGroup1: 19, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [] },
  // Version 2 (25x25)
  { version: 2, totalDataCodewords: 34, ecCodewordsPerBlock: 10, numBlocksGroup1: 1, dataCodewordsGroup1: 34, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [6, 18] },
  // Version 3 (29x29)
  { version: 3, totalDataCodewords: 55, ecCodewordsPerBlock: 15, numBlocksGroup1: 1, dataCodewordsGroup1: 55, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [6, 22] },
  // Version 4 (33x33)
  { version: 4, totalDataCodewords: 80, ecCodewordsPerBlock: 20, numBlocksGroup1: 1, dataCodewordsGroup1: 80, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [6, 26] },
  // Version 5 (37x37)
  { version: 5, totalDataCodewords: 108, ecCodewordsPerBlock: 26, numBlocksGroup1: 1, dataCodewordsGroup1: 108, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [6, 30] },
  // Version 6 (41x41)
  { version: 6, totalDataCodewords: 136, ecCodewordsPerBlock: 18, numBlocksGroup1: 2, dataCodewordsGroup1: 68, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [6, 34] },
  // Version 7 (45x45)
  { version: 7, totalDataCodewords: 156, ecCodewordsPerBlock: 20, numBlocksGroup1: 2, dataCodewordsGroup1: 78, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [6, 22, 38] },
  // Version 8 (49x49)
  { version: 8, totalDataCodewords: 194, ecCodewordsPerBlock: 24, numBlocksGroup1: 2, dataCodewordsGroup1: 97, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [6, 24, 42] },
  // Version 9 (53x53)
  { version: 9, totalDataCodewords: 232, ecCodewordsPerBlock: 30, numBlocksGroup1: 2, dataCodewordsGroup1: 116, numBlocksGroup2: 0, dataCodewordsGroup2: 0, alignmentCoords: [6, 26, 46] },
  // Version 10 (57x57)
  { version: 10, totalDataCodewords: 274, ecCodewordsPerBlock: 18, numBlocksGroup1: 2, dataCodewordsGroup1: 68, numBlocksGroup2: 2, dataCodewordsGroup2: 69, alignmentCoords: [6, 28, 50] },
];

// GF(256) tables with primitive polynomial 0x11D
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]!;
  }
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF_EXP[GF_LOG[a]! + GF_LOG[b]!]!;
}

function rsGeneratorPoly(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    const root = GF_EXP[i]!;
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]!;
      next[j + 1] ^= gfMul(poly[j]!, root);
    }
    poly = next;
  }
  return poly;
}

function rsComputeRemainder(data: Uint8Array, ecDegree: number): Uint8Array {
  const gen = rsGeneratorPoly(ecDegree);
  const rem = new Uint8Array(ecDegree);
  for (let i = 0; i < data.length; i++) {
    const factor = data[i]! ^ rem[0]!;
    rem.copyWithin(0, 1);
    rem[ecDegree - 1] = 0;
    if (factor !== 0) {
      for (let j = 0; j < ecDegree; j++) {
        rem[j] ^= gfMul(gen[j + 1]!, factor);
      }
    }
  }
  return rem;
}

function selectVersion(byteLength: number): VersionSpec {
  for (const spec of VERSION_SPECS_L) {
    const headerBits = spec.version <= 9 ? 4 + 8 : 4 + 16;
    const maxBytes = Math.floor((spec.totalDataCodewords * 8 - headerBits) / 8);
    if (byteLength <= maxBytes) {
      return spec;
    }
  }
  return VERSION_SPECS_L[VERSION_SPECS_L.length - 1]!;
}

function encodeDataCodewords(bytes: Uint8Array, spec: VersionSpec): Uint8Array {
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) {
      bits.push((val >>> i) & 1);
    }
  };

  // Mode indicator: Byte mode (0100)
  pushBits(0b0100, 4);
  // Character count indicator
  pushBits(bytes.length, spec.version <= 9 ? 8 : 16);
  // Payload bytes
  for (const b of bytes) {
    pushBits(b, 8);
  }

  const capacityBits = spec.totalDataCodewords * 8;
  // Terminator (up to 4 zero bits)
  const termLen = Math.min(4, capacityBits - bits.length);
  pushBits(0, termLen);

  // Pad to byte boundary
  while (bits.length % 8 !== 0) {
    bits.push(0);
  }

  const codewords = new Uint8Array(spec.totalDataCodewords);
  let byteIdx = 0;
  for (let i = 0; i < bits.length && byteIdx < spec.totalDataCodewords; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j++) {
      b = (b << 1) | (bits[i + j] ?? 0);
    }
    codewords[byteIdx++] = b;
  }

  const padBytes = [0xec, 0x11];
  let padIdx = 0;
  while (byteIdx < spec.totalDataCodewords) {
    codewords[byteIdx++] = padBytes[padIdx % 2]!;
    padIdx++;
  }
  return codewords;
}

function interleaveCodewords(dataCodewords: Uint8Array, spec: VersionSpec): Uint8Array {
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];
  let offset = 0;

  for (let i = 0; i < spec.numBlocksGroup1; i++) {
    const block = dataCodewords.slice(offset, offset + spec.dataCodewordsGroup1);
    offset += spec.dataCodewordsGroup1;
    dataBlocks.push(block);
    ecBlocks.push(rsComputeRemainder(block, spec.ecCodewordsPerBlock));
  }
  for (let i = 0; i < spec.numBlocksGroup2; i++) {
    const block = dataCodewords.slice(offset, offset + spec.dataCodewordsGroup2);
    offset += spec.dataCodewordsGroup2;
    dataBlocks.push(block);
    ecBlocks.push(rsComputeRemainder(block, spec.ecCodewordsPerBlock));
  }

  const out: number[] = [];
  const maxDataLen = Math.max(spec.dataCodewordsGroup1, spec.dataCodewordsGroup2);
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of dataBlocks) {
      if (i < block.length) out.push(block[i]!);
    }
  }
  for (let i = 0; i < spec.ecCodewordsPerBlock; i++) {
    for (const block of ecBlocks) {
      if (i < block.length) out.push(block[i]!);
    }
  }
  return new Uint8Array(out);
}

function computeFormatBits(eclIndicator: number, maskPattern: number): number {
  const data = (eclIndicator << 3) | maskPattern;
  let rem = data << 10;
  for (let i = 4; i >= 0; i--) {
    if ((rem >>> (i + 10)) & 1) {
      rem ^= 0x537 << i;
    }
  }
  return ((data << 10) | rem) ^ 0x5412;
}

function computeVersionBits(version: number): number {
  let rem = version << 12;
  for (let i = 5; i >= 0; i--) {
    if ((rem >>> (i + 12)) & 1) {
      rem ^= 0x1f25 << i;
    }
  }
  return (version << 12) | rem;
}

export function generateQrMatrix(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const spec = selectVersion(bytes.length);
  const size = spec.version * 4 + 17;

  const modules: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const isFunc: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const setFuncModule = (r: number, c: number, dark: boolean) => {
    if (r >= 0 && r < size && c >= 0 && c < size) {
      modules[r]![c] = dark;
      isFunc[r]![c] = true;
    }
  };

  // Finder pattern + separator
  const drawFinder = (topR: number, leftC: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const r = topR + dr;
        const c = leftC + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        const inOuter = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
        const onBorder = dr === 0 || dr === 6 || dc === 0 || dc === 6;
        const inCenter = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        setFuncModule(r, c, inOuter && (onBorder || inCenter));
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    setFuncModule(6, i, i % 2 === 0);
    setFuncModule(i, 6, i % 2 === 0);
  }

  // Alignment patterns
  const coords = spec.alignmentCoords;
  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords.length; j++) {
      if (
        (i === 0 && j === 0) ||
        (i === 0 && j === coords.length - 1) ||
        (i === coords.length - 1 && j === 0)
      ) {
        continue;
      }
      const cr = coords[i]!;
      const cc = coords[j]!;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const dark = Math.max(Math.abs(dr), Math.abs(dc)) !== 1;
          setFuncModule(cr + dr, cc + dc, dark);
        }
      }
    }
  }

  // Reserve format info areas + dark module
  for (let i = 0; i <= 8; i++) {
    if (i !== 6) {
      setFuncModule(8, i, false);
      setFuncModule(i, 8, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    setFuncModule(8, size - 1 - i, false);
    setFuncModule(size - 1 - i, 8, false);
  }
  setFuncModule(size - 8, 8, true);

  // Version info for V7+
  if (spec.version >= 7) {
    const vBits = computeVersionBits(spec.version);
    for (let i = 0; i < 18; i++) {
      const bit = ((vBits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      setFuncModule(a, b, bit);
      setFuncModule(b, a, bit);
    }
  }

  // Encode & interleave data + EC codewords
  const dataCw = encodeDataCodewords(bytes, spec);
  const allCw = interleaveCodewords(dataCw, spec);

  // Place data bits in upward/downward 2-column zigzag
  let bitIdx = 0;
  const totalBits = allCw.length * 8;
  let upward = true;

  for (let rightCol = size - 1; rightCol >= 1; rightCol -= 2) {
    if (rightCol === 6) rightCol = 5;
    for (let v = 0; v < size; v++) {
      const r = upward ? size - 1 - v : v;
      for (let dc = 0; dc < 2; dc++) {
        const c = rightCol - dc;
        if (!isFunc[r]![c]) {
          let dark = false;
          if (bitIdx < totalBits) {
            const byteVal = allCw[bitIdx >>> 3]!;
            dark = ((byteVal >>> (7 - (bitIdx & 7))) & 1) === 1;
            bitIdx++;
          }
          // Apply Mask 0: (r + c) % 2 === 0
          if ((r + c) % 2 === 0) {
            dark = !dark;
          }
          modules[r]![c] = dark;
        }
      }
    }
    upward = !upward;
  }

  // Write format bits for ECC Level L (01) and Mask 0 (000)
  const fBits = computeFormatBits(0b01, 0);
  for (let i = 0; i <= 5; i++) setFuncModule(8, i, ((fBits >>> i) & 1) === 1);
  setFuncModule(8, 7, ((fBits >>> 6) & 1) === 1);
  setFuncModule(8, 8, ((fBits >>> 7) & 1) === 1);
  setFuncModule(7, 8, ((fBits >>> 8) & 1) === 1);
  for (let i = 9; i < 15; i++) setFuncModule(14 - i, 8, ((fBits >>> i) & 1) === 1);

  for (let i = 0; i < 8; i++) setFuncModule(size - 1 - i, 8, ((fBits >>> i) & 1) === 1);
  for (let i = 8; i < 15; i++) setFuncModule(8, size - 15 + i, ((fBits >>> i) & 1) === 1);
  setFuncModule(size - 8, 8, true);

  return modules;
}

export function renderQrCodeSvg(text: string, pixelSize = 188): string {
  const matrix = generateQrMatrix(text);
  const n = matrix.length;
  const margin = 2;
  const total = n + margin * 2;
  const paths: string[] = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (matrix[r]![c]) {
        paths.push(`M${c + margin},${r + margin}h1v1h-1z`);
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${pixelSize}" height="${pixelSize}" style="width:${pixelSize}px;height:${pixelSize}px;display:block;margin:0 auto;" shape-rendering="crispEdges" role="img" aria-label="NPCI Dynamic UPI QR Code">
    <rect width="100%" height="100%" fill="#ffffff" rx="2"/>
    <path d="${paths.join('')}" fill="#0f172a"/>
  </svg>`;
}
