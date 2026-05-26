// One source of truth for all endpoints exposed by the NestJS backend
// (see backend/src/modules/*/*.controller.ts). The smoke-test page renders
// one card per entry in this list.

export type EndpointSpec = {
  id: string;
  group: 'verify' | 'student' | 'university';
  method: 'GET' | 'POST';
  /** Path relative to VITE_API_BASE, e.g. "/student/credentials/:walletAddress". */
  pathTemplate: string;
  /** Default values for any :params in pathTemplate. */
  pathParams?: Record<string, string>;
  /** Default request body as a JSON string (only for POST). */
  defaultBody?: string;
  /** Whether this route requires the x-admin-api-key header. */
  adminKey?: boolean;
  /** Short description shown under the endpoint title. */
  description: string;
};

const BYTES32_ZERO = '0x' + '00'.repeat(32);
const ADDR_HOLDER = '0x' + '00'.repeat(19) + '01';
const ADDR_ISSUER = '0x' + '00'.repeat(19) + '02';
const SIG_PLACEHOLDER = '0x' + '00'.repeat(65);

export const ENDPOINTS: EndpointSpec[] = [
  // ── verify ────────────────────────────────────────────────────────────
  {
    id: 'verify-status',
    group: 'verify',
    method: 'GET',
    pathTemplate: '/verify/status/:credentialId',
    pathParams: { credentialId: BYTES32_ZERO },
    description:
      'Reads on-chain status. With a placeholder id you should get a 404 — that still proves the route is reachable.',
  },
  {
    id: 'verify-full',
    group: 'verify',
    method: 'POST',
    pathTemplate: '/verify/full',
    defaultBody: JSON.stringify(
      {
        credentialId: BYTES32_ZERO,
        courseId: 'IT1000',
        courseName: 'Smoke Test',
        semester: '2024-1',
        creditsScaled: 400,
        grade: 'A',
        proof: [],
        signature: SIG_PLACEHOLDER,
      },
      null,
      2,
    ),
    description:
      'Full package check. Will likely 404 against fake credentialId — what we want to confirm is "we got an HTTP response".',
  },
  {
    id: 'verify-degree',
    group: 'verify',
    method: 'POST',
    pathTemplate: '/verify/degree',
    defaultBody: JSON.stringify(
      {
        credentialId: BYTES32_ZERO,
        degreeName: 'Bachelor of Engineering',
        major: 'Cybersecurity',
        graduationYear: '2026',
        proof: [],
        signature: SIG_PLACEHOLDER,
      },
      null,
      2,
    ),
    description:
      'Verify that the holder graduated in a specific major using a Merkle proof for the degree leaf.',
  },

  // ── student ───────────────────────────────────────────────────────────
  {
    id: 'student-register',
    group: 'student',
    method: 'POST',
    pathTemplate: '/student/register',
    defaultBody: JSON.stringify(
      {
        walletAddress: ADDR_HOLDER,
        name: 'Smoke Tester',
        studentId: 'SMOKE001',
      },
      null,
      2,
    ),
    description:
      'Idempotent: re-running returns the existing user instead of erroring. Good first ping.',
  },
  {
    id: 'student-credentials',
    group: 'student',
    method: 'GET',
    pathTemplate: '/student/credentials/:walletAddress',
    pathParams: { walletAddress: ADDR_HOLDER },
    description: 'List a holder\'s credentials from Postgres. Returns [] if none.',
  },
  {
    id: 'student-transcript',
    group: 'student',
    method: 'GET',
    pathTemplate: '/student/transcript/:credentialId',
    pathParams: { credentialId: BYTES32_ZERO },
    description:
      'Read-only: returns the degree + course list for a credential. 404 unless the credential exists in the DB.',
  },
  {
    id: 'student-generate-proof',
    group: 'student',
    method: 'POST',
    pathTemplate: '/student/generate-proof',
    defaultBody: JSON.stringify(
      {
        credentialId: BYTES32_ZERO,
        holderAddress: ADDR_HOLDER,
        courseIds: ['IT1000'],
        includeDegree: true,
      },
      null,
      2,
    ),
    description:
      'Generate Merkle proofs. 404 unless the credential exists in the DB — reachability is the goal.',
  },

  // ── university (require admin api key) ────────────────────────────────
  {
    id: 'university-issue',
    group: 'university',
    method: 'POST',
    pathTemplate: '/university/issue',
    adminKey: true,
    defaultBody: JSON.stringify(
      {
        holderAddress: ADDR_HOLDER,
        issuerAddress: ADDR_ISSUER,
        studentId: 'SMOKE001',
        studentName: 'Smoke Tester',
        degree: {
          degreeName: 'Bachelor of Engineering',
          major: 'Cybersecurity',
          graduationYear: '2026',
        },
        transcript: [
          {
            courseId: 'IT1000',
            courseName: 'Intro to Smoke',
            semester: '2024-1',
            creditsScaled: 400,
            grade: 'A',
          },
        ],
      },
      null,
      2,
    ),
    description:
      'Without the admin key you should see 401. With a wrong issuer address you should see 400. Either proves the route is reachable.',
  },
  {
    id: 'university-revoke',
    group: 'university',
    method: 'POST',
    pathTemplate: '/university/revoke',
    adminKey: true,
    defaultBody: JSON.stringify({ credentialId: BYTES32_ZERO }, null, 2),
    description: 'Revoke a credential. Needs x-admin-api-key.',
  },
  {
    id: 'university-add-issuer',
    group: 'university',
    method: 'POST',
    pathTemplate: '/university/add-issuer',
    adminKey: true,
    defaultBody: JSON.stringify(
      { issuerAddress: ADDR_ISSUER, issuerName: 'Smoke University' },
      null,
      2,
    ),
    description: 'Authorize a new issuer wallet. Needs x-admin-api-key.',
  },
];

export function buildPath(template: string, values: Record<string, string>): string {
  return template.replace(/:([A-Za-z_][A-Za-z0-9_]*)/g, (_, name: string) => {
    const v = values[name];
    if (v === undefined || v === '') return `:${name}`;
    return encodeURIComponent(v);
  });
}

export function pathParamNames(template: string): string[] {
  return Array.from(template.matchAll(/:([A-Za-z_][A-Za-z0-9_]*)/g)).map((m) => m[1]);
}
