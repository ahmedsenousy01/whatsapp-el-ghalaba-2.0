/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable no-bitwise */

/**
 * Type definitions for AES encryption/decryption
 */
type Byte = number;
type StateMatrix = Byte[][];
type ExpandedKeys = StateMatrix[];

/**
 * Implementation of AES-128 encryption and decryption
 */
export class AESEncryptor {
  public static readonly S_BOX: readonly Byte[] = [
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

  public static readonly INV_S_BOX: readonly Byte[] = [
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

  public static readonly R_CON: readonly Byte[] = [
    0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36
  ];

  /**
   * Converts a string to a byte array using UTF-8 encoding
   * @param str - The input string
   * @returns A Uint8Array containing the UTF-8 encoded bytes
   */
  public static stringToBytes(str: string): Uint8Array {
    if (typeof str !== "string") {
      throw new TypeError("Input must be a string");
    }
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  /**
   * Converts a byte array back to a string using UTF-8 decoding
   * @param bytes - The input byte array
   * @returns The decoded string
   */
  public static bytesToString(bytes: Uint8Array): string {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError("Input must be a Uint8Array");
    }
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  }

  /**
   * Converts a byte array to a hexadecimal string
   * @param bytes - The input byte array
   * @returns The hexadecimal string representation
   */
  public static bytesToHex(bytes: Uint8Array | Byte[]): string {
    return Array.from(bytes)
      .map((b: Byte): string => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Converts a hexadecimal string to a byte array
   * @param hex - The input hexadecimal string
   * @returns A Uint8Array containing the decoded bytes
   */
  public static hexToBytes(hex: string): Uint8Array {
    if (typeof hex !== "string") {
      throw new TypeError("Input must be a string");
    }
    if (!/^[0-9a-fA-F]*$/.test(hex)) {
      throw new Error("Invalid hex characters");
    }
    if (hex.length % 2 !== 0) {
      throw new Error("Hex string must have an even number of characters");
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      const byte = parseInt(hex.slice(i, i + 2), 16);
      bytes[i / 2] = byte;
    }
    return bytes;
  }

  /**
   * Adds PKCS#7 padding to ensure the input is a multiple of 16 bytes
   * @param input - The input byte array
   * @returns A new Uint8Array with padding added
   */
  private static padInput(input: Uint8Array): Uint8Array {
    const paddingLength = 16 - (input.length % 16);
    const paddedArray = new Uint8Array(input.length + paddingLength);
    paddedArray.set(input);
    paddedArray.fill(paddingLength, input.length);
    return paddedArray;
  }

  /**
   * Removes PKCS#7 padding from a byte array
   * @param bytes - The input byte array with padding
   * @returns A new Uint8Array with padding removed
   */
  private static removePadding(bytes: Uint8Array): Uint8Array {
    const paddingLength = bytes[bytes.length - 1];
    if (paddingLength === 0 || paddingLength! > 16) {
      throw new Error("Invalid padding length");
    }

    const startIndex = bytes.length - paddingLength!;
    for (let i = startIndex; i < bytes.length; i++) {
      if (bytes[i] !== paddingLength) {
        throw new Error("Invalid padding values");
      }
    }

    return bytes.slice(0, startIndex);
  }

  private static validateState(state: StateMatrix): void {
    if (!state) {
      throw new TypeError("State matrix cannot be null or undefined");
    }
    if (!Array.isArray(state) || state.length !== 4) {
      throw new TypeError("Invalid state matrix structure");
    }
    for (const row of state) {
      if (!row) {
        throw new TypeError("State matrix row cannot be null or undefined");
      }
      if (!Array.isArray(row) || row.length !== 4) {
        throw new TypeError("Invalid state matrix row structure");
      }
      for (const byte of row) {
        if (byte === null || byte === undefined) {
          throw new TypeError("State matrix byte cannot be null or undefined");
        }
        if (!Number.isInteger(byte) || byte < 0 || byte > 255) {
          throw new TypeError("Invalid byte value in state matrix");
        }
      }
    }
  }

  private static subBytes(state: StateMatrix): void {
    this.validateState(state);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const index = state[i]?.[j];
        if (index === undefined || index === null) {
          throw new TypeError("State matrix byte cannot be null or undefined");
        }
        const sBoxValue = this.S_BOX[index];
        if (sBoxValue === undefined) {
          throw new TypeError("Invalid S-Box lookup index");
        }
        state[i]![j] = sBoxValue;
      }
    }
  }

  private static invSubBytes(state: StateMatrix): void {
    this.validateState(state);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const index = state[i]?.[j];
        if (index === undefined || index === null) {
          throw new TypeError("State matrix byte cannot be null or undefined");
        }
        const invSBoxValue = this.INV_S_BOX[index];
        if (invSBoxValue === undefined) {
          throw new TypeError("Invalid inverse S-Box lookup index");
        }
        state[i]![j] = invSBoxValue;
      }
    }
  }

  private static shiftRows(state: StateMatrix): void {
    this.validateState(state);
    for (let i = 1; i < 4; i++) {
      if (!state[i]) {
        throw new TypeError("State matrix row cannot be null or undefined");
      }
      const row = [...state[i]!];
      for (let j = 0; j < 4; j++) {
        if (row[(j + i) % 4] === undefined) {
          throw new TypeError("Invalid shift operation: undefined value");
        }
        state[i]![j] = row[(j + i) % 4]!;
      }
    }
  }

  private static invShiftRows(state: StateMatrix): void {
    this.validateState(state);
    for (let i = 1; i < 4; i++) {
      if (!state[i]) {
        throw new TypeError("State matrix row cannot be null or undefined");
      }
      const row = [...state[i]!];
      for (let j = 0; j < 4; j++) {
        if (row[(j - i + 4) % 4] === undefined) {
          throw new TypeError(
            "Invalid inverse shift operation: undefined value"
          );
        }
        state[i]![j] = row[(j - i + 4) % 4]!;
      }
    }
  }

  private static galoisMultiply(a: Byte, b: Byte): Byte {
    if (a === null || a === undefined || b === null || b === undefined) {
      throw new TypeError(
        "Galois multiplication operands cannot be null or undefined"
      );
    }
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
    this.validateState(state);
    for (let i = 0; i < 4; i++) {
      if (!state[i]) {
        throw new TypeError("State matrix row cannot be null or undefined");
      }
      const a = [...state[i]!];
      if (a.some(val => val === null || val === undefined)) {
        throw new TypeError("State matrix values cannot be null or undefined");
      }
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
    this.validateState(state);
    for (let i = 0; i < 4; i++) {
      if (!state[i]) {
        throw new TypeError("State matrix row cannot be null or undefined");
      }
      const a = [...state[i]!];
      if (a.some(val => val === null || val === undefined)) {
        throw new TypeError("State matrix values cannot be null or undefined");
      }
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
    if (!roundKey) {
      throw new TypeError("Round key cannot be null or undefined");
    }
    this.validateState(state);
    this.validateState(roundKey);
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        if (state[i]?.[j] === undefined || roundKey[i]?.[j] === undefined) {
          throw new TypeError("State or round key values cannot be undefined");
        }
        state[i]![j]! ^= roundKey[i]![j]!;
      }
    }
  }

  private static keyExpansion(key: StateMatrix): ExpandedKeys {
    if (!key) {
      throw new TypeError("Key cannot be null or undefined");
    }
    this.validateState(key);
    const expandedKeys: ExpandedKeys = [key];

    for (let i = 1; i < 11; i++) {
      const lastKey = expandedKeys[i - 1];
      if (!lastKey) {
        throw new TypeError(
          "Invalid key expansion state: lastKey is undefined"
        );
      }
      const newKey: StateMatrix = Array.from(
        { length: 4 },
        () => Array(4).fill(0) as Byte[]
      ) as StateMatrix;
      const temp = lastKey.map(row => {
        if (row?.[3] === undefined) {
          throw new TypeError("Invalid key state during expansion");
        }
        return row[3];
      });

      // Rotate
      const firstByte = temp.shift();
      if (firstByte === undefined) {
        throw new Error("Invalid key state during expansion");
      }
      temp.push(firstByte);

      // SubBytes
      for (let j = 0; j < 4; j++) {
        if (temp[j] === undefined) {
          throw new TypeError("Invalid temp array during key expansion");
        }
        const sBoxValue = this.S_BOX[temp[j]!];
        if (sBoxValue === undefined) {
          throw new TypeError("Invalid S-Box lookup during key expansion");
        }
        temp[j] = sBoxValue;
      }

      // XOR with Rcon
      const rconValue = this.R_CON[i - 1];
      if (rconValue === undefined) {
        throw new TypeError("Invalid R_CON lookup during key expansion");
      }
      temp[0]! ^= rconValue;

      // Generate new key columns
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          if (
            lastKey[k]?.[j] === undefined ||
            (j > 0 && newKey[k]?.[j - 1] === undefined)
          ) {
            throw new TypeError("Invalid key state during column generation");
          }
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

  /**
   * Encrypts a plaintext string using AES-128
   * @param plaintext - The input string to encrypt
   * @param key - The encryption key (must be exactly 16 bytes)
   * @returns The encrypted data as a hexadecimal string
   */
  public static encrypt(plaintext: string, key: string): string {
    if (!plaintext || !key) {
      throw new Error("Plaintext and key must not be empty");
    }

    const keyBytes = this.stringToBytes(key);
    if (keyBytes.length !== 16) {
      throw new Error("Key must be exactly 16 bytes (16 characters) long");
    }

    const keyMatrix: StateMatrix = Array.from(
      { length: 4 },
      (_, i) =>
        Array.from({ length: 4 }, (_, j) => keyBytes[i * 4 + j]) as Byte[]
    ) as StateMatrix;

    const plaintextBytes = this.padInput(this.stringToBytes(plaintext));
    const encryptedBytes: Byte[] = [];

    for (let i = 0; i < plaintextBytes.length; i += 16) {
      const block = plaintextBytes.slice(i, i + 16);
      const state: StateMatrix = Array.from(
        { length: 4 },
        (_, j) =>
          Array.from({ length: 4 }, (_, k) => block[j * 4 + k]) as Byte[]
      ) as StateMatrix;

      const expandedKeys = this.keyExpansion(keyMatrix);
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

      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          encryptedBytes.push(state[j]![k]!);
        }
      }
    }

    return this.bytesToHex(encryptedBytes);
  }

  /**
   * Decrypts an AES-128 encrypted hexadecimal string
   * @param ciphertext - The encrypted hexadecimal string
   * @param key - The decryption key (must be exactly 16 bytes)
   * @returns The decrypted plaintext string
   */
  public static decrypt(ciphertext: string, key: string): string {
    if (!ciphertext || !key) {
      throw new Error("Ciphertext and key must not be empty");
    }

    const keyBytes = this.stringToBytes(key);
    if (keyBytes.length !== 16) {
      throw new Error("Key must be exactly 16 bytes (16 characters) long");
    }

    const ciphertextBytes = this.hexToBytes(ciphertext);
    if (ciphertextBytes.length % 16 !== 0) {
      throw new Error("Ciphertext length must be a multiple of 16 bytes");
    }

    const keyMatrix: StateMatrix = Array.from(
      { length: 4 },
      (_, i) =>
        Array.from({ length: 4 }, (_, j) => keyBytes[i * 4 + j]) as Byte[]
    ) as StateMatrix;

    const decryptedBytes: Byte[] = [];

    for (let i = 0; i < ciphertextBytes.length; i += 16) {
      const block = ciphertextBytes.slice(i, i + 16);
      const state: StateMatrix = Array.from(
        { length: 4 },
        (_, j) =>
          Array.from({ length: 4 }, (_, k) => block[j * 4 + k]) as Byte[]
      ) as StateMatrix;

      const expandedKeys = this.keyExpansion(keyMatrix);

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

      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          decryptedBytes.push(state[j]![k]!);
        }
      }
    }

    const unpaddedBytes = this.removePadding(new Uint8Array(decryptedBytes));
    return this.bytesToString(unpaddedBytes);
  }
}

function generateRandomKey({ length }: { length: number }): string {
  const alphabet =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const key = [];
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * alphabet.length);
    key.push(alphabet[index]);
  }
  return key.join("");
}

// Example usage
function main(): void {
  try {
    const plaintext = "Hello, World! This is a test of AES encryption.";
    const key = generateRandomKey({ length: 16 });
    console.log("Original:", plaintext);
    console.log("Key:", key);

    const encrypted = AESEncryptor.encrypt(plaintext, key);
    console.log("Encrypted (Hex):", encrypted);

    const decrypted = AESEncryptor.decrypt(encrypted, key);
    console.log("Decrypted:", decrypted);

    console.log("Decryption successful:", plaintext === decrypted);
  } catch (error) {
    console.error(
      "Encryption/Decryption error:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

// Run the example
main();
