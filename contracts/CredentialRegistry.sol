// Save credential infomation
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./interfaces/IIssuerRegistry.sol";
import "./libraries/DiplomaCrypto.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract CredentialRegistry is EIP712 {
    using ECDSA for bytes32;

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

    constructor(address issuerRegistryAddress) EIP712("CredentialRegistry", "1") {
        require(issuerRegistryAddress != address(0), "Invalid issuer registry");
        issuerRegistry = IIssuerRegistry(issuerRegistryAddress);
    }

    // Allow a relayer to submit a university-signed diploma issuance payload.
    function issueCredential(
        bytes32 credentialId,
        address holder,
        bytes32 merkleRoot,
        bytes32 metadataHash,
        address issuer,
        bytes calldata signature
    ) external {
        require(issuer != address(0), "Invalid issuer");
        require(holder != address(0), "Invalid holder");
        require(!credentials[credentialId].exists, "Credential already exists");

        bytes32 digest = _buildCredentialDigest(
            credentialId,
            holder,
            merkleRoot,
            metadataHash,
            issuer
        );

        address recoveredSigner = ECDSA.recoverCalldata(digest, signature);
        require(recoveredSigner == issuer, "Invalid credential signature");
        require(issuerRegistry.isAuthorizedIssuer(issuer), "Not authorized issuer");

        credentials[credentialId] = Credential({
            issuer: issuer,
            holder: holder,
            merkleRoot: merkleRoot,
            metadataHash: metadataHash,
            revoked: false,
            issuedAt: block.timestamp,
            exists: true
        });

        emit CredentialIssued(
            credentialId,
            issuer,
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

    function getCredentialDigest(bytes32 credentialId) external view returns (bytes32) {
        require(credentials[credentialId].exists, "Credential not found");

        Credential storage credential = credentials[credentialId];
        return _buildCredentialDigest(
            credentialId,
            credential.holder,
            credential.merkleRoot,
            credential.metadataHash,
            credential.issuer
        );
    }

    function hashCredentialPayload(
        bytes32 credentialId,
        address holder,
        bytes32 merkleRoot,
        bytes32 metadataHash,
        address issuer
    ) external view returns (bytes32) {
        return _buildCredentialDigest(
            credentialId,
            holder,
            merkleRoot,
            metadataHash,
            issuer
        );
    }

    function credentialExists(bytes32 credentialId) external view returns (bool) {
        return credentials[credentialId].exists;
    }

    function _buildCredentialDigest(
        bytes32 credentialId,
        address holder,
        bytes32 merkleRoot,
        bytes32 metadataHash,
        address issuer
    ) internal view returns (bytes32) {
        return _hashTypedDataV4(
            DiplomaCrypto.hashCredentialStruct(
                credentialId,
                holder,
                merkleRoot,
                metadataHash,
                issuer
            )
        );
    }
}
