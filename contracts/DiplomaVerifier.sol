// Verify logic
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./interfaces/IIssuerRegistry.sol";
import "./interfaces/ICredentialRegistry.sol";
import "./libraries/DiplomaCrypto.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract DiplomaVerifier {
    using ECDSA for bytes32;

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
        return _isCredentialActive(credentialId);
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
        return DiplomaCrypto.processProof(proof, leaf) == root;
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

    function hashTranscriptLeaf(
        string memory courseId,
        string memory courseName,
        string memory semester,
        uint32 creditsScaled,
        string memory grade
    ) public pure returns (bytes32) {
        return
            DiplomaCrypto.hashTranscriptLeaf(courseId, courseName, semester, creditsScaled, grade);
    }

    function hashDegreeLeaf(
        string memory degreeName,
        string memory major,
        string memory graduationYear
    ) public pure returns (bytes32) {
        return DiplomaCrypto.hashDegreeLeaf(
            degreeName,
            major,
            graduationYear
        );
    }

    function verifyCredentialSignature(
        bytes32 credentialId,
        bytes calldata signature
    ) public view returns (bool) {
        if (!_isCredentialActive(credentialId)) {
            return false;
        }

        address issuer = credentialRegistry.getCredentialIssuer(credentialId);
        bytes32 digest = credentialRegistry.getCredentialDigest(credentialId);
        (address recoveredSigner, ECDSA.RecoverError err, ) = ECDSA.tryRecoverCalldata(
            digest,
            signature
        );

        return err == ECDSA.RecoverError.NoError && recoveredSigner == issuer;
    }

    function verifyCredentialPackage(
        bytes32 credentialId,
        string memory courseId,
        string memory courseName,
        string memory semester,
        uint32 creditsScaled,
        string memory grade,
        bytes32[] memory proof,
        bytes calldata signature
    ) external view returns (bool) {
        if (!verifyCredentialSignature(credentialId, signature)) {
            return false;
        }

        bytes32 root = credentialRegistry.getMerkleRoot(credentialId);
        bytes32 leaf = hashTranscriptLeaf(courseId, courseName, semester, creditsScaled, grade);

        return verifyMerkleProof(proof, root, leaf);
    }

    function verifyDegreePackage(
        bytes32 credentialId,
        string memory degreeName,
        string memory major,
        string memory graduationYear,
        bytes32[] memory proof,
        bytes calldata signature
    ) external view returns (bool) {
        if (!verifyCredentialSignature(credentialId, signature)) {
            return false;
        }

        bytes32 root = credentialRegistry.getMerkleRoot(credentialId);

        bytes32 leaf = hashDegreeLeaf(
            degreeName,
            major,
            graduationYear
        );

        return verifyMerkleProof(proof, root, leaf);
    }

    // hash from leaf to root
    function processProof(bytes32[] memory proof, bytes32 leaf) public pure returns (bytes32) {
        return DiplomaCrypto.processProof(proof, leaf);
    }

    // hash 2 nodes in incresing order
    function _hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return DiplomaCrypto.hashPair(a, b);
    }

    function _isCredentialActive(bytes32 credentialId) internal view returns (bool) {
        if (!credentialRegistry.credentialExists(credentialId)) {
            return false;
        }

        if (credentialRegistry.isRevoked(credentialId)) {
            return false;
        }

        address issuer = credentialRegistry.getCredentialIssuer(credentialId);
        return issuerRegistry.isAuthorizedIssuer(issuer);
    }
}
