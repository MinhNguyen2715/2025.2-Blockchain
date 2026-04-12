// Verify logic
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IIssuerRegistry.sol";
import "./interfaces/ICredentialRegistry.sol";

contract DiplomaVerifier {
    // List of verified universities
    IIssuerRegistry public issuerRegistry;
    // List of issued diplima
    ICredentialRegistry public credentialRegistry;

    constructor(address issuerRegistryAddress, address credentialRegistryAddress) {
        require(issuerRegistryAddress != address(0), "Invalid issuer registry");
        require(credentialRegistryAddress != address(0), "Invalid credential registry");

        issuerRegistry = IIssuerRegistry(issuerRegistryAddress);
        credentialRegistry = ICredentialRegistry(credentialRegistryAddress);
    }

    function verifyIssuer(address issuer) external view returns (bool) {
        return issuerRegistry.isAuthorizedIssuer(issuer);
    }

    // Check if: credential exists, is not revoked, issuer is valid
    function verifyCredentialStatus(bytes32 credentialId) external view returns (bool) {
        if (!credentialRegistry.credentialExists(credentialId)) {
            return false;
        }

        if (credentialRegistry.isRevoked(credentialId)) {
            return false;
        }

        address issuer = credentialRegistry.getCredentialIssuer(credentialId);

        if (!issuerRegistry.isAuthorizedIssuer(issuer)) {
            return false;
        }

        return true;
    }

    // Return Merkle root if credential is valid
    function getCredentialMerkleRoot(bytes32 credentialId) external view returns (bytes32) {
        require(credentialRegistry.credentialExists(credentialId), "Credential not found");
        require(!credentialRegistry.isRevoked(credentialId), "Credential revoked");

        address issuer = credentialRegistry.getCredentialIssuer(credentialId);
        require(issuerRegistry.isAuthorizedIssuer(issuer), "Issuer not authorized");

        return credentialRegistry.getMerkleRoot(credentialId);
    }

    // Verify if a Merkle proof match root or not.
    function verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) public pure returns (bool) {
        return processProof(proof, leaf) == root;
    }

    // Check: credential status (exist, revoke), valid issuer, verify root
    function verifyCredentialMerkleProof(
        bytes32 credentialId,
        bytes32 leaf,
        bytes32[] memory proof
    ) external view returns (bool) {
        require(credentialRegistry.credentialExists(credentialId), "Credential not found");
        require(!credentialRegistry.isRevoked(credentialId), "Credential revoked");

        address issuer = credentialRegistry.getCredentialIssuer(credentialId);
        require(issuerRegistry.isAuthorizedIssuer(issuer), "Issuer not authorized");

        bytes32 root = credentialRegistry.getMerkleRoot(credentialId);
        return verifyMerkleProof(proof, root, leaf);
    }

    // hash from leaf to root
    function processProof(bytes32[] memory proof, bytes32 leaf) public pure returns (bytes32) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = _hashPair(computedHash, proof[i]);
        }

        return computedHash;
    }

    // hash 2 nodes in incresing order
    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a <= b
            ? keccak256(abi.encodePacked(a, b))
            : keccak256(abi.encodePacked(b, a));
    }
}