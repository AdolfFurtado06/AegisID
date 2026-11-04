// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title IdentityVerification
 * @notice On-chain credential registry for privacy-preserving KYC verification.
 * Only the owner (authorized issuer/admin) can issue and revoke credentials.
 * Third parties can verify active status without exposing sensitive private details.
 */
contract IdentityVerification is Ownable {
    struct Identity {
        address subject;
        address issuer;
        bytes32 documentCommitment;
        uint256 issuedAt;
        uint256 revokedAt;
        bool exists;
        bool revoked;
    }

    // Mapping from opaque bytes32 credential ID to Identity record
    mapping(bytes32 => Identity) public identities;

    // Events
    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed subject,
        address issuer
    );

    event CredentialRevoked(
        bytes32 indexed credentialId,
        address indexed issuer
    );

    /**
     * @dev Initialize contract with deployer as the initial owner and authorized issuer.
     */
    constructor() Ownable(msg.sender) {}

    /**
     * @notice Issue a new identity credential commitment.
     * @param credentialId Opaque unique credential identifier
     * @param subject Wallet address of the identity holder (or placeholder)
     * @param documentCommitment Salted cryptographic hash commitment of verified identity document
     */
    function issueCredential(
        bytes32 credentialId,
        address subject,
        bytes32 documentCommitment
    ) external onlyOwner {
        require(credentialId != bytes32(0), "Invalid credential ID");
        require(subject != address(0), "Invalid subject address");
        require(documentCommitment != bytes32(0), "Invalid document commitment");
        require(!identities[credentialId].exists, "Credential already exists");

        identities[credentialId] = Identity({
            subject: subject,
            issuer: msg.sender,
            documentCommitment: documentCommitment,
            issuedAt: block.timestamp,
            revokedAt: 0,
            exists: true,
            revoked: false
        });

        emit CredentialIssued(credentialId, subject, msg.sender);
    }

    /**
     * @notice Revoke an active credential.
     * @param credentialId Opaque credential identifier to revoke
     */
    function revokeCredential(bytes32 credentialId) external onlyOwner {
        require(identities[credentialId].exists, "Credential does not exist");
        require(!identities[credentialId].revoked, "Credential already revoked");

        identities[credentialId].revoked = true;
        identities[credentialId].revokedAt = block.timestamp;

        emit CredentialRevoked(credentialId, msg.sender);
    }

    /**
     * @notice Public verification method for verifiers & QR code lookups.
     * @param credentialId Credential identifier
     * @return exists Whether the credential exists on-chain
     * @return active Whether the credential is currently valid (exists and not revoked)
     * @return subject The wallet address of the credential holder
     * @return issuer The wallet address of the issuing administrator
     * @return issuedAt Timestamp when credential was issued
     * @return revokedAt Timestamp when credential was revoked (0 if active)
     */
    function verifyCredential(bytes32 credentialId)
        external
        view
        returns (
            bool exists,
            bool active,
            address subject,
            address issuer,
            uint256 issuedAt,
            uint256 revokedAt
        )
    {
        Identity memory id = identities[credentialId];
        return (
            id.exists,
            id.exists && !id.revoked,
            id.subject,
            id.issuer,
            id.issuedAt,
            id.revokedAt
        );
    }

    /**
     * @notice Check whether a credential exists.
     * @param credentialId Credential identifier
     */
    function credentialExists(bytes32 credentialId) external view returns (bool) {
        return identities[credentialId].exists;
    }

    /**
     * @notice Retrieve full credential metadata.
     * @param credentialId Credential identifier
     */
    function getCredential(bytes32 credentialId)
        external
        view
        returns (Identity memory)
    {
        require(identities[credentialId].exists, "Credential does not exist");
        return identities[credentialId];
    }
}
