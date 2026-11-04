const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

const CONTRACT_ABI = [
  "function issueCredential(bytes32 credentialId, address subject, bytes32 documentCommitment) external",
  "function revokeCredential(bytes32 credentialId) external",
  "function verifyCredential(bytes32 credentialId) external view returns (bool exists, bool active, address subject, address issuer, uint256 issuedAt, uint256 revokedAt)",
  "function credentialExists(bytes32 credentialId) external view returns (bool)",
  "function getCredential(bytes32 credentialId) external view returns (tuple(address subject, address issuer, bytes32 documentCommitment, uint256 issuedAt, uint256 revokedAt, bool exists, bool revoked))",
  "function owner() external view returns (address)",
  "event CredentialIssued(bytes32 indexed credentialId, address indexed subject, address issuer)",
  "event CredentialRevoked(bytes32 indexed credentialId, address indexed issuer)",
];

const contractInterface = new ethers.Interface(CONTRACT_ABI);

function getDeployedContractAddress() {
  if (process.env.CONTRACT_ADDRESS && process.env.CONTRACT_ADDRESS.trim().length > 0) {
    return process.env.CONTRACT_ADDRESS.trim();
  }

  // Fallback to deployed-contract.json if present
  try {
    const deployedJsonPath = path.join(
      __dirname,
      "..",
      "..",
      "..",
      "blockchain",
      "deployed-contract.json"
    );
    if (fs.existsSync(deployedJsonPath)) {
      const data = JSON.parse(fs.readFileSync(deployedJsonPath, "utf8"));
      if (data.address) return data.address;
    }
  } catch (err) {
    // Ignore and return empty
  }
  return null;
}

function getProvider() {
  const rpcUrl = process.env.RPC_URL || "http://127.0.0.1:8545";
  return new ethers.JsonRpcProvider(rpcUrl, 31337, { staticNetwork: true });
}

function getReadOnlyContract() {
  const address = getDeployedContractAddress();
  if (!address) {
    throw new Error("Contract address is not configured. Please deploy the contract first.");
  }
  const provider = getProvider();
  return new ethers.Contract(address, CONTRACT_ABI, provider);
}

/**
 * Returns an authorized signer for backend-initiated transactions.
 * Uses default local Hardhat test account #0 (well-known development key).
 */
function getIssuerSigner() {
  const provider = getProvider();
  // Hardhat default Account #0 private key for local development
  const localDevPrivateKey =
    process.env.ISSUER_PRIVATE_KEY ||
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
  return new ethers.Wallet(localDevPrivateKey, provider);
}

function getIssuerContract() {
  const address = getDeployedContractAddress();
  if (!address) {
    throw new Error("Contract address is not configured. Please deploy the contract first.");
  }
  const signer = getIssuerSigner();
  return new ethers.Contract(address, CONTRACT_ABI, signer);
}

function assertReceiptSucceeded(receipt, transactionHash) {
  if (!receipt) {
    throw new Error(`Transaction receipt not found for ${transactionHash}.`);
  }
  if (receipt.status !== 1) {
    throw new Error(`Blockchain transaction ${transactionHash} failed.`);
  }
  if (!receipt.to || receipt.to.toLowerCase() !== getDeployedContractAddress().toLowerCase()) {
    throw new Error("Blockchain transaction was not sent to the configured identity contract.");
  }
}

function parseReceiptEvent(receipt, eventName, expectedArgs) {
  for (const log of receipt.logs || []) {
    try {
      const parsed = contractInterface.parseLog(log);
      if (!parsed || parsed.name !== eventName) continue;
      for (const [key, expected] of Object.entries(expectedArgs)) {
        if (String(parsed.args[key]).toLowerCase() !== String(expected).toLowerCase()) {
          throw new Error(`Blockchain ${eventName} event did not match the requested values.`);
        }
      }
      return parsed;
    } catch (err) {
      if (err.message && err.message.includes(`Blockchain ${eventName}`)) throw err;
      // Ignore logs emitted by other contracts in the same transaction.
    }
  }
  throw new Error(`Verified ${eventName} event was not found in the transaction receipt.`);
}

async function verifyIssueReceipt(transactionHash, expected) {
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(transactionHash);
  assertReceiptSucceeded(receipt, transactionHash);
  const parsed = parseReceiptEvent(receipt, "CredentialIssued", {
    credentialId: expected.credentialId,
    subject: expected.subjectAddress,
    issuer: expected.issuerAddress,
  });
  const contract = getReadOnlyContract();
  const identity = await contract.getCredential(expected.credentialId);
  if (
    identity.subject.toLowerCase() !== expected.subjectAddress.toLowerCase() ||
    identity.issuer.toLowerCase() !== expected.issuerAddress.toLowerCase() ||
    identity.documentCommitment.toLowerCase() !== expected.documentCommitment.toLowerCase() ||
    !identity.exists ||
    identity.revoked
  ) {
    throw new Error("On-chain credential metadata did not match the requested issuance.");
  }
  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    credentialId: parsed.args.credentialId,
  };
}

async function verifyRevokeReceipt(transactionHash, expected) {
  const provider = getProvider();
  const receipt = await provider.getTransactionReceipt(transactionHash);
  assertReceiptSucceeded(receipt, transactionHash);
  const parsed = parseReceiptEvent(receipt, "CredentialRevoked", {
    credentialId: expected.credentialId,
    issuer: expected.issuerAddress,
  });
  const state = await getReadOnlyContract().verifyCredential(expected.credentialId);
  if (!state.exists || state.active || state.issuer.toLowerCase() !== expected.issuerAddress.toLowerCase()) {
    throw new Error("On-chain credential was not confirmed as revoked.");
  }
  return {
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    credentialId: parsed.args.credentialId,
  };
}

/**
 * Read-only status check directly from blockchain.
 */
async function verifyOnChain(credentialId) {
  try {
    const contract = getReadOnlyContract();
    const result = await contract.verifyCredential(credentialId);
    return {
      exists: result[0],
      active: result[1],
      subject: result[2],
      issuer: result[3],
      issuedAt: Number(result[4]),
      revokedAt: Number(result[5]),
      contractAddress: getDeployedContractAddress(),
    };
  } catch (err) {
    console.error("Error reading blockchain verification:", err.message);
    return {
      exists: false,
      active: false,
      unavailable: true,
      error: err.message,
    };
  }
}

/**
 * Executes issueCredential transaction on-chain.
 */
async function issueCredentialOnChain(credentialId, subjectAddress, documentCommitment) {
  const contract = getIssuerContract();
  console.log(`Submitting on-chain issue for ${credentialId} (subject: ${subjectAddress})...`);
  const tx = await contract.issueCredential(credentialId, subjectAddress, documentCommitment);
  const receipt = await tx.wait(1);
  return verifyIssueReceipt(receipt.hash, {
    credentialId,
    subjectAddress,
    documentCommitment,
    issuerAddress: await contract.runner.getAddress(),
  });
}

/**
 * Executes revokeCredential transaction on-chain.
 */
async function revokeCredentialOnChain(credentialId) {
  const contract = getIssuerContract();
  console.log(`Submitting on-chain revocation for ${credentialId}...`);
  const tx = await contract.revokeCredential(credentialId);
  const receipt = await tx.wait(1);
  return verifyRevokeReceipt(receipt.hash, {
    credentialId,
    issuerAddress: await contract.runner.getAddress(),
  });
}

module.exports = {
  CONTRACT_ABI,
  getDeployedContractAddress,
  getProvider,
  getReadOnlyContract,
  getIssuerContract,
  verifyOnChain,
  verifyIssueReceipt,
  verifyRevokeReceipt,
  issueCredentialOnChain,
  revokeCredentialOnChain,
};
