import { AbiCoder, TypedDataEncoder, ethers } from "ethers";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const abiCoder = AbiCoder.defaultAbiCoder();

export const DIPLOMA_DOMAIN = {
  name: "CredentialRegistry",
  version: "1",
};

export const DIPLOMA_TYPES = {
  DiplomaCredential: [
    { name: "credentialId", type: "bytes32" },
    { name: "holder", type: "address" },
    { name: "merkleRoot", type: "bytes32" },
    { name: "metadataHash", type: "bytes32" },
    { name: "issuer", type: "address" },
  ],
};

export const TRANSCRIPT_LEAF_TYPEHASH = ethers.id(
  "TranscriptLeaf(string courseId,string courseName,string semester,uint32 creditsScaled,string grade)",
);

export function buildDiplomaDomain(chainId, verifyingContract) {
  return {
    ...DIPLOMA_DOMAIN,
    chainId: Number(chainId),
    verifyingContract,
  };
}

export function getCredentialDigest(chainId, verifyingContract, payload) {
  return TypedDataEncoder.hash(
    buildDiplomaDomain(chainId, verifyingContract),
    DIPLOMA_TYPES,
    payload,
  );
}

export async function signCredentialPayload(
  signer,
  chainId,
  verifyingContract,
  payload,
) {
  return signer.signTypedData(
    buildDiplomaDomain(chainId, verifyingContract),
    DIPLOMA_TYPES,
    payload,
  );
}

export function hashTranscriptLeaf(record) {
  return ethers.keccak256(
    abiCoder.encode(
      ["bytes32", "bytes32", "bytes32", "bytes32", "uint32", "bytes32"],
      [
        TRANSCRIPT_LEAF_TYPEHASH,
        ethers.keccak256(ethers.toUtf8Bytes(record.courseId)),
        ethers.keccak256(ethers.toUtf8Bytes(record.courseName)),
        ethers.keccak256(ethers.toUtf8Bytes(record.semester)),
        record.creditsScaled,
        ethers.keccak256(ethers.toUtf8Bytes(record.grade)),
      ],
    ),
  );
}

export function buildTranscriptMerkleTree(transcript) {
  const leaves = transcript.map(hashTranscriptLeaf);
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

  return {
    leaves,
    tree,
    root: tree.getHexRoot(),
  };
}
