const crypto = require("crypto");
const fs = require("fs");
const { ethers } = require("ethers");

/**
 * Computes SHA-256 hash of a file buffer or disk path.
 * @param {string} filePath - Absolute path to uploaded document
 * @returns {string} - Hex string of file SHA-256 hash
 */
function hashFile(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Generates a cryptographically random 32-byte salt (hex encoded).
 */
function generateSalt() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes a privacy-preserving salted commitment (bytes32 hex format).
 * commitment = keccak256(fileSha256Hex + ":" + saltHex)
 * @param {string} fileSha256
 * @param {string} salt
 * @returns {string} 0x-prefixed 32-byte hex string
 */
function computeCommitment(fileSha256, salt) {
  const combined = `${fileSha256}:${salt}`;
  return ethers.keccak256(ethers.toUtf8Bytes(combined));
}

/**
 * Generates a unique opaque credential ID formatted as bytes32.
 * @returns {string} 0x-prefixed 32-byte hex string
 */
function generateCredentialId() {
  const randomEntropy = crypto.randomBytes(32).toString("hex") + Date.now();
  return ethers.keccak256(ethers.toUtf8Bytes(randomEntropy));
}

module.exports = {
  hashFile,
  generateSalt,
  computeCommitment,
  generateCredentialId,
};
