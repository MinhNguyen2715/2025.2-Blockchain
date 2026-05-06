// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library DiplomaCrypto {
    bytes32 internal constant CREDENTIAL_TYPEHASH = keccak256(
        "DiplomaCredential(bytes32 credentialId,address holder,bytes32 merkleRoot,bytes32 metadataHash,address issuer)"
    );

    bytes32 internal constant TRANSCRIPT_LEAF_TYPEHASH = keccak256(
        "TranscriptLeaf(string courseId,string courseName,string semester,uint32 creditsScaled,string grade)"
    );

    function hashCredentialStruct(
        bytes32 credentialId,
        address holder,
        bytes32 merkleRoot,
        bytes32 metadataHash,
        address issuer
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    CREDENTIAL_TYPEHASH,
                    credentialId,
                    holder,
                    merkleRoot,
                    metadataHash,
                    issuer
                )
            );
    }

    function hashTranscriptLeaf(
        string memory courseId,
        string memory courseName,
        string memory semester,
        uint32 creditsScaled,
        string memory grade
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    TRANSCRIPT_LEAF_TYPEHASH,
                    keccak256(bytes(courseId)),
                    keccak256(bytes(courseName)),
                    keccak256(bytes(semester)),
                    creditsScaled,
                    keccak256(bytes(grade))
                )
            );
    }

    function processProof(bytes32[] memory proof, bytes32 leaf) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = hashPair(computedHash, proof[i]);
        }

        return computedHash;
    }

    function hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a <= b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }
}
