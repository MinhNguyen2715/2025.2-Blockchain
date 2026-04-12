// Manage the university allowed to issue digital diploma
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract IssuerRegistry {
    // Owner: contract manager
    address public owner;
    // authorizedIssuers: university address
    mapping(address => bool) private authorizedIssuers;
    // issuerNames: university name
    mapping(address => string) private issuerNames;

    event IssuerAdded(address indexed issuer, string name);
    event IssuerRemoved(address indexed issuer);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // Only owner can add / delete issuer
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        address oldOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    // Add a new valid issuer
    function addIssuer(address issuer, string calldata name) external onlyOwner {
        require(issuer != address(0), "Invalid issuer");
        require(!authorizedIssuers[issuer], "Issuer already exists");

        authorizedIssuers[issuer] = true;
        issuerNames[issuer] = name;

        emit IssuerAdded(issuer, name);
    }

    // Remove issuer
    function removeIssuer(address issuer) external onlyOwner {
        require(authorizedIssuers[issuer], "Issuer not found");

        authorizedIssuers[issuer] = false;
        issuerNames[issuer] = "";

        emit IssuerRemoved(issuer);
    }

    // Check the validity of issuer
    function isAuthorizedIssuer(address issuer) external view returns (bool) {
        return authorizedIssuers[issuer];
    }
    
    function getIssuerName(address issuer) external view returns (string memory) {
        require(authorizedIssuers[issuer], "Issuer not found");
        return issuerNames[issuer];
    }
}