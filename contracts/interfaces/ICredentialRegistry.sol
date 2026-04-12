// Define functions from CredentialRegistry
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICredentialRegistry {
    function isRevoked(bytes32 credentialId) external view returns (bool);
    function getMerkleRoot(bytes32 credentialId) external view returns (bytes32);
    function getCredentialIssuer(bytes32 credentialId) external view returns (address);
    function credentialExists(bytes32 credentialId) external view returns (bool);
}