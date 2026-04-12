// Save credential infomation
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./interfaces/IIssuerRegistry.sol";

contract CredentialRegistry {
    struct Credential {
        address issuer;
        address holder;
        bytes32 merkleRoot;
        bytes32 metadataHash;
        bool revoked;
        uint256 issuedAt;
        bool exists;
    }

    // Point to issuerRegistry to check validity of issuer
    IIssuerRegistry public issuerRegistry;

    mapping(bytes32 => Credential) private credentials;

    event CredentialIssued(
        bytes32 indexed credentialId,
        address indexed issuer,
        address indexed holder,
        bytes32 merkleRoot,
        bytes32 metadataHash
    );

    event CredentialRevoked(
        bytes32 indexed credentialId,
        address indexed issuer
    );

    constructor(address issuerRegistryAddress) {
        require(issuerRegistryAddress != address(0), "Invalid issuer registry");
        issuerRegistry = IIssuerRegistry(issuerRegistryAddress);
    }

    // Allow an authorized university to issue a diploma
    function issueCredential(
        bytes32 credentialId,
        address holder,
        bytes32 merkleRoot,
        bytes32 metadataHash
    ) external {
        require(issuerRegistry.isAuthorizedIssuer(msg.sender), "Not authorized issuer");
        require(holder != address(0), "Invalid holder");
        require(!credentials[credentialId].exists, "Credential already exists");

        credentials[credentialId] = Credential({
            issuer: msg.sender,
            holder: holder,
            merkleRoot: merkleRoot,
            metadataHash: metadataHash,
            revoked: false,
            issuedAt: block.timestamp,
            exists: true
        });

        emit CredentialIssued(
            credentialId,
            msg.sender,
            holder,
            merkleRoot,
            metadataHash
        );
    }

    
    function revokeCredential(bytes32 credentialId) external {
        require(credentials[credentialId].exists, "Credential not found");
        require(credentials[credentialId].issuer == msg.sender, "Not credential issuer");
        require(!credentials[credentialId].revoked, "Credential already revoked");

        credentials[credentialId].revoked = true;

        emit CredentialRevoked(credentialId, msg.sender);
    }

    function isRevoked(bytes32 credentialId) external view returns (bool) {
        require(credentials[credentialId].exists, "Credential not found");
        return credentials[credentialId].revoked;
    }

    function getMerkleRoot(bytes32 credentialId) external view returns (bytes32) {
        require(credentials[credentialId].exists, "Credential not found");
        return credentials[credentialId].merkleRoot;
    }

    function getCredentialIssuer(bytes32 credentialId) external view returns (address) {
        require(credentials[credentialId].exists, "Credential not found");
        return credentials[credentialId].issuer;
    }

    function getCredentialHolder(bytes32 credentialId) external view returns (address) {
        require(credentials[credentialId].exists, "Credential not found");
        return credentials[credentialId].holder;
    }

    function getMetadataHash(bytes32 credentialId) external view returns (bytes32) {
        require(credentials[credentialId].exists, "Credential not found");
        return credentials[credentialId].metadataHash;
    }

    function credentialExists(bytes32 credentialId) external view returns (bool) {
        return credentials[credentialId].exists;
    }
}