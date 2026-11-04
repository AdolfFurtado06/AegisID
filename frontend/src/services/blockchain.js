import { ethers } from "ethers";

export const IDENTITY_CONTRACT_ABI = [
  "function issueCredential(bytes32 credentialId, address subject, bytes32 documentCommitment) external",
  "function revokeCredential(bytes32 credentialId) external",
  "function owner() external view returns (address)",
];

function requireMetaMask() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed.");
  }
  return new ethers.BrowserProvider(window.ethereum);
}

async function ensureHardhatNetwork(provider) {
  const chainId = await provider.send("eth_chainId", []);
  if (chainId === "0x7a69") return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x7a69" }],
    });
  } catch (error) {
    if (error.code !== 4902) throw error;
    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: "0x7a69",
          chainName: "Hardhat Local",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: ["http://127.0.0.1:8545"],
        },
      ],
    });
  }
}

async function getContract(contractAddress) {
  const provider = requireMetaMask();
  await ensureHardhatNetwork(provider);
  const network = await provider.getNetwork();
  if (network.chainId !== 31337n) {
    throw new Error("MetaMask must be connected to the local Hardhat network (chain ID 31337).");
  }
  const signer = await provider.getSigner();
  const contract = new ethers.Contract(contractAddress, IDENTITY_CONTRACT_ABI, signer);
  const [signerAddress, ownerAddress] = await Promise.all([
    signer.getAddress(),
    contract.owner(),
  ]);
  if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
    throw new Error("The connected MetaMask account is not the authorized contract issuer.");
  }
  return contract;
}

export async function issueCredentialWithWallet(contractAddress, credentialId, subjectAddress, commitment) {
  const contract = await getContract(contractAddress);
  const tx = await contract.issueCredential(credentialId, subjectAddress, commitment);
  const receipt = await tx.wait(1);
  return { transactionHash: tx.hash, blockNumber: receipt.blockNumber };
}

export async function revokeCredentialWithWallet(contractAddress, credentialId) {
  const contract = await getContract(contractAddress);
  const tx = await contract.revokeCredential(credentialId);
  const receipt = await tx.wait(1);
  return { transactionHash: tx.hash, blockNumber: receipt.blockNumber };
}
