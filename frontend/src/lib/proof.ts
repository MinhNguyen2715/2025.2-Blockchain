// The "proof bundle" is the artifact a student exports and a verifier loads.
// It stitches together everything a verifier needs to call /verify/* :
//   - the credential id + issuer signature (from the credential record)
//   - the degree claim + its Merkle proof (when the student chose to reveal it)
//   - each selected course + its Merkle proof
// The backend's /student/generate-proof response does NOT include the issuer
// signature (that lives on the credential), so the student page merges it in
// when building the bundle below.

export type DegreeClaim = {
  degreeName: string;
  major: string;
  graduationYear: string;
};

export type CourseClaim = {
  courseId: string;
  courseName: string;
  semester: string;
  creditsScaled: number;
  grade: string;
  proof: string[];
};

export type ProofBundle = {
  credentialId: string;
  signature: string;
  degree?: DegreeClaim;
  degreeProof?: string[];
  courses?: CourseClaim[];
};

/** Shape of the /student/generate-proof response. */
export type GenerateProofResponse = {
  credentialId: string;
  degree?: DegreeClaim;
  degreeProof?: string[];
  courseData?: Array<Omit<CourseClaim, 'proof'>>;
  proofs?: Record<string, string[]>;
};

/** Merge the credential signature into the generate-proof output. */
export function buildBundle(signature: string, gp: GenerateProofResponse): ProofBundle {
  const courses: CourseClaim[] = (gp.courseData ?? []).map((c) => ({
    ...c,
    proof: gp.proofs?.[c.courseId] ?? [],
  }));
  return {
    credentialId: gp.credentialId,
    signature,
    degree: gp.degree,
    degreeProof: gp.degreeProof,
    courses,
  };
}

/** Loosely validate + normalize parsed JSON into a ProofBundle. */
export function parseBundle(text: string): ProofBundle {
  const obj = JSON.parse(text) as Record<string, unknown>;
  if (!obj || typeof obj !== 'object') throw new Error('not an object');
  if (typeof obj.credentialId !== 'string') throw new Error('missing credentialId');
  const bundle: ProofBundle = {
    credentialId: obj.credentialId,
    signature: typeof obj.signature === 'string' ? obj.signature : '',
  };
  if (obj.degree && typeof obj.degree === 'object') {
    bundle.degree = obj.degree as DegreeClaim;
  }
  if (Array.isArray(obj.degreeProof)) bundle.degreeProof = obj.degreeProof as string[];
  if (Array.isArray(obj.courses)) bundle.courses = obj.courses as CourseClaim[];
  return bundle;
}
