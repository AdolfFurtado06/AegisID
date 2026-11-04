const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("--------------------------------------------------");
  console.log("Deploying IdentityVerification contract with account:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const Factory = await ethers.getContractFactory("IdentityVerification");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("IdentityVerification deployed successfully to:", contractAddress);
  console.log("Owner / Issuer address:", deployer.address);
  console.log("--------------------------------------------------");

  // Save contract details for frontend and backend use
  const contractInfo = {
    address: contractAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    deployedAt: new Date().toISOString(),
  };

  const deployedInfoPath = path.join(__dirname, "..", "deployed-contract.json");
  fs.writeFileSync(deployedInfoPath, JSON.stringify(contractInfo, null, 2));
  console.log("Saved deployed contract info to:", deployedInfoPath);
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
