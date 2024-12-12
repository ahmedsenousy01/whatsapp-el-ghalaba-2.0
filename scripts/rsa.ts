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

// Function to check if a number is prime using Miller-Rabin test
function isPrime(n: bigint, k = 128): boolean {
  if (n === 2n || n === 3n) return true;
  if (n % 2n === 0n || n <= 1n) return false;

  let s = 0n;
  let d = n - 1n;
  while (d % 2n === 0n) {
    d /= 2n;
    s++;
  }

  for (let i = 0; i < k; i++) {
    // Generate a random number between 2 and n-2
    const range = n - 4n;
    const randomBytes = crypto.randomBytes(
      Math.ceil(range.toString(2).length / 8)
    );
    const a = (BigInt("0x" + randomBytes.toString("hex")) % range) + 2n;

    let x = modExp(a, d, n);
    if (x === 1n || x === n - 1n) continue;

    let shouldContinue = false;
    for (let r = 1n; r < s; r++) {
      x = modExp(x, 2n, n);
      if (x === n - 1n) {
        shouldContinue = true;
        break;
      }
    }
    if (!shouldContinue) return false;
  }
  return true;
}

// Modular exponentiation (a^b % m)
function modExp(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base = base % mod;
  while (exp > 0) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp = exp >> 1n;
    base = (base * base) % mod;
  }
  return result;
}

// Function to generate a large prime number of a specified bit size
function generateLargePrime(bitsize: number): bigint {
  while (true) {
    const primeCandidate = generateRandomBigInt(bitsize) | 1n; // Ensure it's odd
    if (isPrime(primeCandidate)) return primeCandidate;
  }
}

// Function to generate a random BigInt of a given bit size
function generateRandomBigInt(bitsize: number): bigint {
  const byteSize = Math.ceil(bitsize / 8);
  const randomBytes = crypto.randomBytes(byteSize);
  let randomBigInt = BigInt(`0x${randomBytes.toString("hex")}`);
  // Ensure the number has the correct bit length
  const mask = (1n << BigInt(bitsize)) - 1n;
  randomBigInt = randomBigInt & mask;
  randomBigInt = randomBigInt | (1n << BigInt(bitsize - 1)); // Ensure it's the correct bit size
  return randomBigInt;
}

// Function to generate RSA key pair
function generateRSAKeys(bitsize = 2048): RSAKeyPair {
  const e = 65537n; // Common public exponent
  const p = generateLargePrime(bitsize / 2);
  const q = generateLargePrime(bitsize / 2);
  const n = p * q;
  const phiN = (p - 1n) * (q - 1n);

  if (gcd(e, phiN) !== 1n) {
    throw new Error("e and phiN are not coprime");
  }
  const d = modInverse(e, phiN);

  return {
    publicKey: { n, e },
    privateKey: { n, d }
  };
}

// Function to compute GCD
function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

// Function to compute modular inverse
function modInverse(a: bigint, m: bigint): bigint {
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

// Function to encrypt a message in chunks
function encrypt(plaintext: string, n: bigint, e: bigint): Buffer[] {
  const MAX_CHUNK_SIZE = 245; // Maximum size for 2048-bit RSA
  if (plaintext.length > MAX_CHUNK_SIZE * 1000) {
    throw new Error(
      `Message too long. Maximum length is ${MAX_CHUNK_SIZE * 1000} characters`
    );
  }

  const chunks: Buffer[] = [];

  // Split the message into chunks
  for (let i = 0; i < plaintext.length; i += MAX_CHUNK_SIZE) {
    const chunk = plaintext.slice(i, i + MAX_CHUNK_SIZE);
    const chunkBytes = Buffer.from(chunk, "utf8");
    const chunkInt = BigInt("0x" + chunkBytes.toString("hex"));
    const encryptedChunk = modExp(chunkInt, e, n);
    chunks.push(Buffer.from(encryptedChunk.toString(16), "hex"));
  }

  return chunks;
}

// Function to decrypt a message from chunks
function decrypt(ciphertext: Buffer[], n: bigint, d: bigint): string {
  let plaintext = "";

  for (const chunk of ciphertext) {
    if (chunk.length === 0) {
      throw new Error("Invalid ciphertext chunk: empty buffer");
    }
    const encryptedChunk = BigInt("0x" + chunk.toString("hex"));
    const decryptedChunk = modExp(encryptedChunk, d, n);
    const hexString = decryptedChunk.toString(16);
    const paddedHex = hexString.length % 2 ? "0" + hexString : hexString;
    plaintext += Buffer.from(paddedHex, "hex").toString("utf8");
  }

  return plaintext;
}

// Example usage
const message = "Hello, RSA and AES! This is a test message.";

// RSA encryption/decryption
const { publicKey, privateKey } = generateRSAKeys();
const { n, e } = publicKey;
const { d } = privateKey;

console.log("RSA Public Key:", { n: n.toString(10), e: e.toString(10) });

try {
  const rsaCiphertext = encrypt(message, n, e);
  console.log(
    "RSA Ciphertext (chunks):",
    rsaCiphertext.map(chunk => chunk.toString("hex")).toString(),
    "\n"
  );

  const rsaDecrypted = decrypt(rsaCiphertext, n, d);
  console.log("RSA Decrypted:", rsaDecrypted, "\n");
} catch (error) {
  console.error("Encryption/Decryption error:", (error as Error).message);
}
