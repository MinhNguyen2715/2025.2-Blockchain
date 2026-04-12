// Define functions from IssuerRegistry
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IIssuerRegistry {
    function isAuthorizedIssuer(address issuer) external view returns (bool);
}