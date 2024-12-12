import crypto from "crypto";

interface RSAKeyPair {
  publicKey: {
    n: bigint;
    e: bigint;
  };
  privateKey: {
    n: bigint;
    d: bigint;
  };
}

type Byte = number;
type StateMatrix = Byte[][];
type ExpandedKeys = StateMatrix[];

export class CryptoService {
  private static readonly RSA_KEY_SIZE = 2048;
  private static readonly RSA_PUBLIC_EXPONENT = 65537n;

  // AES S-Box and inverse S-Box for substitution
  private static readonly S_BOX: readonly Byte[] = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b,
    0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0,
    0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0, 0xb7, 0xfd, 0x93, 0x26,
    0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2,
    0xeb, 0x27, 0xb2, 0x75, 0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0,
    0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed,
    0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f,
    0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5,
    0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2, 0xcd, 0x0c, 0x13, 0xec,
    0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14,
    0xde, 0x5e, 0x0b, 0xdb, 0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c,
    0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d,
    0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f,
    0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e,
    0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e, 0xe1, 0xf8, 0x98, 0x11,
    0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f,
    0xb0, 0x54, 0xbb, 0x16
  ];

  private static readonly INV_S_BOX: readonly Byte[] = [
    0x52, 0x09, 0x6a, 0xd5, 0x30, 0x36, 0xa5, 0x38, 0xbf, 0x40, 0xa3, 0x9e,
    0x81, 0xf3, 0xd7, 0xfb, 0x7c, 0xe3, 0x39, 0x82, 0x9b, 0x2f, 0xff, 0x87,
    0x34, 0x8e, 0x43, 0x44, 0xc4, 0xde, 0xe9, 0xcb, 0x54, 0x7b, 0x94, 0x32,
    0xa6, 0xc2, 0x23, 0x3d, 0xee, 0x4c, 0x95, 0x0b, 0x42, 0xfa, 0xc3, 0x4e,
    0x08, 0x2e, 0xa1, 0x66, 0x28, 0xd9, 0x24, 0xb2, 0x76, 0x5b, 0xa2, 0x49,
    0x6d, 0x8b, 0xd1, 0x25, 0x72, 0xf8, 0xf6, 0x64, 0x86, 0x68, 0x98, 0x16,
    0xd4, 0xa4, 0x5c, 0xcc, 0x5d, 0x65, 0xb6, 0x92, 0x6c, 0x70, 0x48, 0x50,
    0xfd, 0xed, 0xb9, 0xda, 0x5e, 0x15, 0x46, 0x57, 0xa7, 0x8d, 0x9d, 0x84,
    0x90, 0xd8, 0xab, 0x00, 0x8c, 0xbc, 0xd3, 0x0a, 0xf7, 0xe4, 0x58, 0x05,
    0xb8, 0xb3, 0x45, 0x06, 0xd0, 0x2c, 0x1e, 0x8f, 0xca, 0x3f, 0x0f, 0x02,
    0xc1, 0xaf, 0xbd, 0x03, 0x01, 0x13, 0x8a, 0x6b, 0x3a, 0x91, 0x11, 0x41,
    0x4f, 0x67, 0xdc, 0xea, 0x97, 0xf2, 0xcf, 0xce, 0xf0, 0xb4, 0xe6, 0x73,
    0x96, 0xac, 0x74, 0x22, 0xe7, 0xad, 0x35, 0x85, 0xe2, 0xf9, 0x37, 0xe8,
    0x1c, 0x75, 0xdf, 0x6e, 0x47, 0xf1, 0x1a, 0x71, 0x1d, 0x29, 0xc5, 0x89,
    0x6f, 0xb7, 0x62, 0x0e, 0xaa, 0x18, 0xbe, 0x1b, 0xfc, 0x56, 0x3e, 0x4b,
    0xc6, 0xd2, 0x79, 0x20, 0x9a, 0xdb, 0xc0, 0xfe, 0x78, 0xcd, 0x5a, 0xf4,
    0x1f, 0xdd, 0xa8, 0x33, 0x88, 0x07, 0xc7, 0x31, 0xb1, 0x12, 0x10, 0x59,
    0x27, 0x80, 0xec, 0x5f, 0x60, 0x51, 0x7f, 0xa9, 0x19, 0xb5, 0x4a, 0x0d,
    0x2d, 0xe5, 0x7a, 0x9f, 0x93, 0xc9, 0x9c, 0xef, 0xa0, 0xe0, 0x3b, 0x4d,
    0xae, 0x2a, 0xf5, 0xb0, 0xc8, 0xeb, 0xbb, 0x3c, 0x83, 0x53, 0x99, 0x61,
    0x17, 0x2b, 0x04, 0x7e, 0xba, 0x77, 0xd6, 0x26, 0xe1, 0x69, 0x14, 0x63,
    0x55, 0x21, 0x0c, 0x7d
  ];

  private static readonly R_CON: readonly Byte[] = [
    0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
  ];

  // RSA Methods
  public static generateRSAKeyPair(): RSAKeyPair {
    const e = this.RSA_PUBLIC_EXPONENT;
    const p = this.generateLargePrime(this.RSA_KEY_SIZE / 2);
    const q = this.generateLargePrime(this.RSA_KEY_SIZE / 2);
    const n = p * q;
    const phiN = (p - 1n) * (q - 1n);

    if (this.gcd(e, phiN) !== 1n) {
      throw new Error("e and phiN are not coprime");
    }
    const d = this.modInverse(e, phiN);

    return {
      publicKey: { n, e },
      privateKey: { n, d }
    };
  }

  public static encryptRSA(plaintext: string, n: bigint, e: bigint): Buffer[] {
    const MAX_CHUNK_SIZE = 245; // Maximum size for 2048-bit RSA
    if (plaintext.length > MAX_CHUNK_SIZE * 1000) {
      throw new Error(
        `Message too long. Maximum length is ${MAX_CHUNK_SIZE * 1000} characters`
      );
    }

    const chunks: Buffer[] = [];
    for (let i = 0; i < plaintext.length; i += MAX_CHUNK_SIZE) {
      const chunk = plaintext.slice(i, i + MAX_CHUNK_SIZE);
      const chunkBytes = Buffer.from(chunk, "utf8");
      const chunkInt = BigInt("0x" + chunkBytes.toString("hex"));
      const encryptedChunk = this.modExp(chunkInt, e, n);
      chunks.push(Buffer.from(encryptedChunk.toString(16), "hex"));
    }

    return chunks;
  }

  public static decryptRSA(ciphertext: Buffer[], n: bigint, d: bigint): string {
    let plaintext = "";

    for (const chunk of ciphertext) {
      if (chunk.length === 0) {
        throw new Error("Invalid ciphertext chunk: empty buffer");
      }
      const encryptedChunk = BigInt("0x" + chunk.toString("hex"));
      const decryptedChunk = this.modExp(encryptedChunk, d, n);
      const hexString = decryptedChunk.toString(16);
      const paddedHex = hexString.length % 2 ? "0" + hexString : hexString;
      plaintext += Buffer.from(paddedHex, "hex").toString("utf8");
    }

    return plaintext;
  }

  // AES Methods
  public static generateAESKey({ length }: { length: number }): string {
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const key = [];
    for (let i = 0; i < length; i++) {
      const index = Math.floor(Math.random() * alphabet.length);
      key.push(alphabet[index]);
    }
    return key.join("");
  }

  public static encryptAES(plaintext: string, key: string): string {
    const keyBytes = this.stringToBytes(key);
    if (keyBytes.length !== 16) {
      throw new Error("Key must be exactly 16 bytes (16 characters) long");
    }
    const bytes = this.stringToBytes(plaintext);
    const paddedBytes = this.padInput(bytes);
    const keyMatrix = this.bytesToMatrix(keyBytes);
    const expandedKeys = this.keyExpansion(keyMatrix);
    const encrypted = new Uint8Array(paddedBytes.length);

    for (let i = 0; i < paddedBytes.length; i += 16) {
      const block = paddedBytes.slice(i, i + 16);
      const state = this.bytesToMatrix(block);

      this.addRoundKey(state, expandedKeys[0]!);

      for (let round = 1; round < 10; round++) {
        this.subBytes(state);
        this.shiftRows(state);
        this.mixColumns(state);
        this.addRoundKey(state, expandedKeys[round]!);
      }

      this.subBytes(state);
      this.shiftRows(state);
      this.addRoundKey(state, expandedKeys[10]!);

      const encryptedBlock = this.matrixToBytes(state);
      encrypted.set(encryptedBlock, i);
    }

    return this.bytesToHex(encrypted);
  }

  public static decryptAES(ciphertext: string, key: string): string {
    const keyBytes = this.stringToBytes(key);
    if (keyBytes.length !== 16) {
      throw new Error("Key must be exactly 16 bytes (16 characters) long");
    }
    const bytes = this.hexToBytes(ciphertext);
    const keyMatrix = this.bytesToMatrix(keyBytes);
    const expandedKeys = this.keyExpansion(keyMatrix);
    const decrypted = new Uint8Array(bytes.length);

    for (let i = 0; i < bytes.length; i += 16) {
      const block = bytes.slice(i, i + 16);
      const state = this.bytesToMatrix(block);

      this.addRoundKey(state, expandedKeys[10]!);
      this.invShiftRows(state);
      this.invSubBytes(state);

      for (let round = 9; round >= 1; round--) {
        this.addRoundKey(state, expandedKeys[round]!);
        this.invMixColumns(state);
        this.invShiftRows(state);
        this.invSubBytes(state);
      }

      this.addRoundKey(state, expandedKeys[0]!);

      const decryptedBlock = this.matrixToBytes(state);
      decrypted.set(decryptedBlock, i);
    }

    const unpaddedBytes = this.removePadding(decrypted);
    return this.bytesToString(unpaddedBytes);
  }

  // RSA Helper Methods
  private static isPrime(n: bigint, k = 128): boolean {
    if (n === 2n || n === 3n) return true;
    if (n % 2n === 0n || n <= 1n) return false;

    let s = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
      d /= 2n;
      s++;
    }

    for (let i = 0; i < k; i++) {
      const range = n - 4n;
      const randomBytes = crypto.randomBytes(
        Math.ceil(range.toString(2).length / 8)
      );
      const a = (BigInt("0x" + randomBytes.toString("hex")) % range) + 2n;

      let x = this.modExp(a, d, n);
      if (x === 1n || x === n - 1n) continue;

      let shouldContinue = false;
      for (let r = 1n; r < s; r++) {
        x = this.modExp(x, 2n, n);
        if (x === n - 1n) {
          shouldContinue = true;
          break;
        }
      }
      if (!shouldContinue) return false;
    }
    return true;
  }

  private static modExp(base: bigint, exp: bigint, mod: bigint): bigint {
    let result = 1n;
    base = base % mod;
    while (exp > 0) {
      if (exp % 2n === 1n) result = (result * base) % mod;
      exp = exp >> 1n;
      base = (base * base) % mod;
    }
    return result;
  }

  private static generateLargePrime(bitsize: number): bigint {
    while (true) {
      const primeCandidate = this.generateRandomBigInt(bitsize) | 1n;
      if (this.isPrime(primeCandidate)) return primeCandidate;
    }
  }

  private static generateRandomBigInt(bitsize: number): bigint {
    const byteSize = Math.ceil(bitsize / 8);
    const randomBytes = crypto.randomBytes(byteSize);
    let randomBigInt = BigInt(`0x${randomBytes.toString("hex")}`);
    const mask = (1n << BigInt(bitsize)) - 1n;
    randomBigInt = randomBigInt & mask;
    randomBigInt = randomBigInt | (1n << BigInt(bitsize - 1));
    return randomBigInt;
  }

  private static gcd(a: bigint, b: bigint): bigint {
    while (b !== 0n) {
      const temp = b;
      b = a % b;
      a = temp;
    }
    return a;
  }

  private static modInverse(a: bigint, m: bigint): bigint {
    const m0 = m;
    let x0 = 0n;
    let x1 = 1n;
    while (a > 1n) {
      const q = a / m;
      [m, a] = [a % m, m];
      [x0, x1] = [x1 - q * x0, x0];
    }
    return x1 < 0n ? x1 + m0 : x1;
  }

  // AES Helper Methods
  private static stringToBytes(str: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  private static bytesToString(bytes: Uint8Array): string {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  private static bytesToHex(bytes: Uint8Array | Byte[]): string {
    return Array.from(bytes)
      .map((b: Byte): string => b.toString(16).padStart(2, "0"))
      .join("");
  }

  private static hexToBytes(hex: string): Uint8Array {
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
      throw new Error("Invalid hex characters");
    }
    if (hex.length % 2 !== 0) {
      throw new Error("Hex string must have an even number of characters");
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  private static padInput(input: Uint8Array): Uint8Array {
    const paddingLength = 16 - (input.length % 16);
    const paddedArray = new Uint8Array(input.length + paddingLength);
    paddedArray.set(input);
    paddedArray.fill(paddingLength, input.length);
    return paddedArray;
  }

  private static removePadding(bytes: Uint8Array): Uint8Array {
    const paddingLength = bytes[bytes.length - 1];
    if (!paddingLength || paddingLength === 0 || paddingLength > 16) {
      throw new Error("Invalid padding length");
    }

    for (let i = bytes.length - paddingLength; i < bytes.length; i++) {
      if (bytes[i] !== paddingLength) {
        throw new Error("Invalid padding values");
      }
    }

    return bytes.slice(0, bytes.length - paddingLength);
  }

  private static bytesToMatrix(bytes: Uint8Array): StateMatrix {
    const matrix: StateMatrix = Array.from(
      { length: 4 },
      () => Array(4).fill(0) as Byte[]
    );
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        matrix[i]![j] = bytes[i * 4 + j]!;
      }
    }
    return matrix;
  }

  private static matrixToBytes(matrix: StateMatrix): Uint8Array {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        bytes[i * 4 + j] = matrix[i]![j]!;
      }
    }
    return bytes;
  }

  private static subBytes(state: StateMatrix): void {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        state[i]![j] = this.S_BOX[state[i]![j]!]!;
      }
    }
  }

  private static invSubBytes(state: StateMatrix): void {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        state[i]![j] = this.INV_S_BOX[state[i]![j]!]!;
      }
    }
  }

  private static shiftRows(state: StateMatrix): void {
    for (let i = 1; i < 4; i++) {
      const row = [...state[i]!];
      for (let j = 0; j < 4; j++) {
        state[i]![j] = row[(j + i) % 4]!;
      }
    }
  }

  private static invShiftRows(state: StateMatrix): void {
    for (let i = 1; i < 4; i++) {
      const row = [...state[i]!];
      for (let j = 0; j < 4; j++) {
        state[i]![j] = row[(j - i + 4) % 4]!;
      }
    }
  }

  private static galoisMultiply(a: Byte, b: Byte): Byte {
    let result = 0;
    let tempA = a;
    let tempB = b;

    for (let i = 0; i < 8; i++) {
      if ((tempB & 1) !== 0) {
        result ^= tempA;
      }
      const highBitSet = (tempA & 0x80) !== 0;
      tempA = (tempA << 1) & 0xff;
      if (highBitSet) {
        tempA ^= 0x1b;
      }
      tempB >>= 1;
    }
    return result;
  }

  private static mixColumns(state: StateMatrix): void {
    for (let i = 0; i < 4; i++) {
      const a = [...state[i]!];
      state[i]![0] =
        this.galoisMultiply(a[0]!, 2) ^
        this.galoisMultiply(a[1]!, 3) ^
        a[2]! ^
        a[3]!;
      state[i]![1] =
        a[0]! ^
        this.galoisMultiply(a[1]!, 2) ^
        this.galoisMultiply(a[2]!, 3) ^
        a[3]!;
      state[i]![2] =
        a[0]! ^
        a[1]! ^
        this.galoisMultiply(a[2]!, 2) ^
        this.galoisMultiply(a[3]!, 3);
      state[i]![3] =
        this.galoisMultiply(a[0]!, 3) ^
        a[1]! ^
        a[2]! ^
        this.galoisMultiply(a[3]!, 2);
    }
  }

  private static invMixColumns(state: StateMatrix): void {
    for (let i = 0; i < 4; i++) {
      const a = [...state[i]!];
      state[i]![0] =
        this.galoisMultiply(a[0]!, 0x0e) ^
        this.galoisMultiply(a[1]!, 0x0b) ^
        this.galoisMultiply(a[2]!, 0x0d) ^
        this.galoisMultiply(a[3]!, 0x09);
      state[i]![1] =
        this.galoisMultiply(a[0]!, 0x09) ^
        this.galoisMultiply(a[1]!, 0x0e) ^
        this.galoisMultiply(a[2]!, 0x0b) ^
        this.galoisMultiply(a[3]!, 0x0d);
      state[i]![2] =
        this.galoisMultiply(a[0]!, 0x0d) ^
        this.galoisMultiply(a[1]!, 0x09) ^
        this.galoisMultiply(a[2]!, 0x0e) ^
        this.galoisMultiply(a[3]!, 0x0b);
      state[i]![3] =
        this.galoisMultiply(a[0]!, 0x0b) ^
        this.galoisMultiply(a[1]!, 0x0d) ^
        this.galoisMultiply(a[2]!, 0x09) ^
        this.galoisMultiply(a[3]!, 0x0e);
    }
  }

  private static addRoundKey(state: StateMatrix, roundKey: StateMatrix): void {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        state[i]![j]! ^= roundKey[i]![j]!;
      }
    }
  }

  private static keyExpansion(key: StateMatrix): ExpandedKeys {
    const expandedKeys: ExpandedKeys = [key];

    for (let i = 1; i < 11; i++) {
      const lastKey = expandedKeys[i - 1]!;
      const newKey: StateMatrix = Array.from(
        { length: 4 },
        () => Array(4).fill(0) as Byte[]
      );

      const temp = lastKey.map(row => row[3]!);
      const firstByte = temp.shift()!;
      temp.push(firstByte);

      for (let j = 0; j < 4; j++) {
        temp[j] = this.S_BOX[temp[j]!]!;
      }

      temp[0]! ^= this.R_CON[i - 1]!;

      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          newKey[k]![j] =
            j === 0
              ? lastKey[k]![j]! ^ temp[k]!
              : lastKey[k]![j]! ^ newKey[k]![j - 1]!;
        }
      }

      expandedKeys.push(newKey);
    }

    return expandedKeys;
  }

  public static generateHash(): string {
    const alphabet =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const key = [];
    for (let i = 0; i < 32; i++) {
      const index = Math.floor(Math.random() * alphabet.length);
      key.push(alphabet[index]);
    }
    return key.join("");
  }
}
