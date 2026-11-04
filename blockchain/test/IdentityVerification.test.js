const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("IdentityVerification", function () {
  let contract;
  let owner;
  let user1;
  let verifier;

  const mockCredId = ethers.keccak256(ethers.toUtf8Bytes("CREDENTIAL-001"));
  const mockCommitment = ethers.keccak256(ethers.toUtf8Bytes("SALTED-HASH-ABC"));

  beforeEach(async function () {
    [owner, user1, verifier] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("IdentityVerification");
    contract = await Factory.deploy();
    await contract.waitForDeployment();
  });

  it("sets the deployer as owner", async function () {
    expect(await contract.owner()).to.equal(owner.address);
  });

  describe("issueCredential", function () {
    it("allows the owner to issue a valid credential", async function () {
      await expect(
        contract.issueCredential(mockCredId, user1.address, mockCommitment)
      )
        .to.emit(contract, "CredentialIssued")
        .withArgs(mockCredId, user1.address, owner.address);

      expect(await contract.credentialExists(mockCredId)).to.be.true;

      const verification = await contract.verifyCredential(mockCredId);
      expect(verification.exists).to.be.true;
      expect(verification.active).to.be.true;
      expect(verification.subject).to.equal(user1.address);
      expect(verification.issuer).to.equal(owner.address);
      expect(verification.revokedAt).to.equal(0);
    });

    it("rejects unauthorized issuance by non-owner", async function () {
      await expect(
        contract.connect(user1).issueCredential(mockCredId, user1.address, mockCommitment)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("rejects issuance with zero address subject", async function () {
      await expect(
        contract.issueCredential(mockCredId, ethers.ZeroAddress, mockCommitment)
      ).to.be.revertedWith("Invalid subject address");
    });

    it("rejects issuance with empty credential ID", async function () {
      await expect(
        contract.issueCredential(ethers.ZeroHash, user1.address, mockCommitment)
      ).to.be.revertedWith("Invalid credential ID");
    });

    it("rejects issuance with empty document commitment", async function () {
      await expect(
        contract.issueCredential(mockCredId, user1.address, ethers.ZeroHash)
      ).to.be.revertedWith("Invalid document commitment");
    });

    it("rejects duplicate credential IDs", async function () {
      await contract.issueCredential(mockCredId, user1.address, mockCommitment);
      await expect(
        contract.issueCredential(mockCredId, user1.address, mockCommitment)
      ).to.be.revertedWith("Credential already exists");
    });
  });

  describe("revokeCredential", function () {
    beforeEach(async function () {
      await contract.issueCredential(mockCredId, user1.address, mockCommitment);
    });

    it("allows the owner to revoke an active credential", async function () {
      await expect(contract.revokeCredential(mockCredId))
        .to.emit(contract, "CredentialRevoked")
        .withArgs(mockCredId, owner.address);

      const verification = await contract.verifyCredential(mockCredId);
      expect(verification.exists).to.be.true;
      expect(verification.active).to.be.false;
      expect(verification.revokedAt).to.be.gt(0);
    });

    it("rejects revocation by unauthorized wallet", async function () {
      await expect(
        contract.connect(user1).revokeCredential(mockCredId)
      ).to.be.revertedWithCustomError(contract, "OwnableUnauthorizedAccount");
    });

    it("rejects repeat revocation", async function () {
      await contract.revokeCredential(mockCredId);
      await expect(
        contract.revokeCredential(mockCredId)
      ).to.be.revertedWith("Credential already revoked");
    });

    it("rejects revoking a non-existent credential", async function () {
      const nonExistent = ethers.keccak256(ethers.toUtf8Bytes("NON-EXISTENT"));
      await expect(
        contract.revokeCredential(nonExistent)
      ).to.be.revertedWith("Credential does not exist");
    });
  });

  describe("public verification and read methods", function () {
    it("reports not found for unissued credential", async function () {
      const unissued = ethers.keccak256(ethers.toUtf8Bytes("UNISSUED"));
      const verification = await contract.connect(verifier).verifyCredential(unissued);
      expect(verification.exists).to.be.false;
      expect(verification.active).to.be.false;
    });

    it("retrieves full metadata via getCredential", async function () {
      await contract.issueCredential(mockCredId, user1.address, mockCommitment);
      const identity = await contract.getCredential(mockCredId);
      expect(identity.subject).to.equal(user1.address);
      expect(identity.issuer).to.equal(owner.address);
      expect(identity.documentCommitment).to.equal(mockCommitment);
      expect(identity.exists).to.be.true;
      expect(identity.revoked).to.be.false;
    });
  });
});
