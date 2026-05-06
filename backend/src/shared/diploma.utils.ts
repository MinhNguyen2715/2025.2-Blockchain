import { Injectable } from '@nestjs/common';
import { AbiCoder, TypedDataEncoder, ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

const abiCoder = AbiCoder.defaultAbiCoder();

@Injectable()
export class DiplomaUtils {
  readonly DIPLOMA_DOMAIN = {
    name: 'CredentialRegistry',
    version: '1',
  };

  readonly DIPLOMA_TYPES = {
    DiplomaCredential: [
      { name: 'credentialId', type: 'bytes32' },
      { name: 'holder', type: 'address' },
      { name: 'merkleRoot', type: 'bytes32' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'issuer', type: 'address' },
    ],
  };

  readonly TRANSCRIPT_LEAF_TYPEHASH = ethers.id(
    'TranscriptLeaf(string courseId,string courseName,string semester,uint32 creditsScaled,string grade)',
  );

  buildDiplomaDomain(chainId: number, verifyingContract: string) {
    return {
      ...this.DIPLOMA_DOMAIN,
      chainId,
      verifyingContract,
    };
  }

  getCredentialDigest(
    chainId: number,
    verifyingContract: string,
    payload: Record<string, unknown>,
  ): string {
    return TypedDataEncoder.hash(
      this.buildDiplomaDomain(chainId, verifyingContract),
      this.DIPLOMA_TYPES,
      payload as Record<string, unknown>,
    );
  }

  async signCredentialPayload(
    signer: ethers.Signer,
    chainId: number,
    verifyingContract: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    return signer.signTypedData(
      this.buildDiplomaDomain(chainId, verifyingContract),
      this.DIPLOMA_TYPES,
      payload as Record<string, unknown>,
    );
  }

  hashTranscriptLeaf(record: {
    courseId: string;
    courseName: string;
    semester: string;
    creditsScaled: number;
    grade: string;
  }): string {
    return ethers.keccak256(
      abiCoder.encode(
        ['bytes32', 'bytes32', 'bytes32', 'bytes32', 'uint32', 'bytes32'],
        [
          this.TRANSCRIPT_LEAF_TYPEHASH,
          ethers.keccak256(ethers.toUtf8Bytes(record.courseId)),
          ethers.keccak256(ethers.toUtf8Bytes(record.courseName)),
          ethers.keccak256(ethers.toUtf8Bytes(record.semester)),
          record.creditsScaled,
          ethers.keccak256(ethers.toUtf8Bytes(record.grade)),
        ],
      ),
    );
  }

  buildTranscriptMerkleTree(transcript: Array<{
    courseId: string;
    courseName: string;
    semester: string;
    creditsScaled: number;
    grade: string;
  }>) {
    const leaves = transcript.map((record) => this.hashTranscriptLeaf(record));
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    return {
      leaves,
      tree,
      root: tree.getHexRoot(),
    };
  }

  getMerkleProof(
    tree: MerkleTree,
    transcript: Array<{ courseId: string; courseName: string; semester: string; creditsScaled: number; grade: string }>,
    targetCourseId: string,
  ): string[] {
    const leaf = this.hashTranscriptLeaf(
      transcript.find((c) => c.courseId === targetCourseId)!,
    );
    return tree.getHexProof(leaf);
  }
}