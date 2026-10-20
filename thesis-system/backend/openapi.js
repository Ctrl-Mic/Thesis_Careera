const categories = [
  "Customer and Personal Service", "Speaking", "Writing", "Foreign Language",
  "Helping People", "Sales and Marketing", "Time Management", "Complex Problem Solving",
  "Monitoring", "Clerical", "Computers and Electronics", "Management of Financial Resources",
  "Economics and Accounting", "Sociology and Anthropology", "Public Safety and Security",
  "Instructing", "Operations Analysis", "Negotiation",
];

const errorRef = (name) => ({ $ref: `#/components/responses/${name}` });
const jsonBody = (schema, example) => ({
  required: true,
  content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` }, ...(example ? { example } : {}) } },
});
const jsonResponse = (description, schema, example) => ({
  description,
  content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` }, ...(example ? { example } : {}) } },
});
const bearer = [{ bearerAuth: [] }];
const emailParameter = {
  name: "email",
  in: "query",
  required: true,
  description: "Must match the authenticated account's email.",
  schema: { type: "string", format: "email" },
  example: "alex.sample@example.test",
};

const spec = {
  openapi: "3.0.3",
  info: {
    title: "Careera Express API",
    version: "1.0.0",
    description: "Interactive documentation for the Careera Node.js API. The separate InsightFace API has its own /docs page.",
  },
  servers: [{ url: "/", description: "Current Express server" }],
  tags: [
    { name: "Health" }, { name: "Authentication" }, { name: "Profile" },
    { name: "Verification" }, { name: "Assessment" }, { name: "Recommendations" },
    { name: "Administration" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"], summary: "Check Express availability", operationId: "getExpressHealth",
        description: "Checks only that Express is responding; it does not check PostgreSQL or InsightFace.",
        responses: { "200": jsonResponse("Express is responding.", "HealthResponse", { status: "ok" }) },
      },
    },
    "/api/register": {
      post: {
        tags: ["Authentication"], summary: "Start account registration", operationId: "registerAccount",
        description: "Validates details against an existing student record and returns a temporary token. Both verification steps are required to finish registration.",
        requestBody: jsonBody("RegisterRequest", { fullName: "Alex Sample", studentId: "PDM-2099-000001", email: "alex.sample@example.test", password: "sample-password-123" }),
        responses: {
          "202": jsonResponse("Registration is pending verification.", "RegistrationPending", { success: true, registrationPending: true, message: "Complete both verification steps to create your account.", token: "temporary-token-returned-by-this-request" }),
          "400": errorRef("BadRequest"), "403": errorRef("Forbidden"), "409": errorRef("Conflict"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/login": {
      post: {
        tags: ["Authentication"], summary: "Sign in", operationId: "login",
        requestBody: jsonBody("LoginRequest", { email: "alex.sample@example.test", password: "sample-password-123" }),
        responses: {
          "200": jsonResponse("Credentials accepted.", "LoginResponse", { success: true, user: { id: "00000000-0000-4000-8000-000000000001", fullName: "Alex Sample", email: "alex.sample@example.test", isAdmin: false }, verificationRequired: false, token: "bearer-token-returned-by-this-request" }),
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/profile": {
      get: {
        tags: ["Profile"], summary: "Get the authenticated user's profile", operationId: "getProfile",
        description: "The email query is retained for compatibility and must match the bearer token's account.",
        security: bearer, parameters: [emailParameter],
        responses: {
          "200": jsonResponse("Profile and resume metadata returned.", "ProfileResponse", { success: true, user: { fullName: "Alex Sample", email: "alex.sample@example.test" }, resume: null }),
          "401": errorRef("Unauthorized"), "403": errorRef("Forbidden"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/profile/resume": {
      post: {
        tags: ["Profile"], summary: "Upload or replace the authenticated user's resume", operationId: "uploadResume",
        description: "Accepts a base64-encoded text PDF smaller than 5 MB. The email must match the bearer token. Extracted resume text is used for skill evidence and is not returned.",
        security: bearer,
        requestBody: jsonBody("ResumeUploadRequest", { email: "alex.sample@example.test", fileName: "resume.pdf", contentBase64: "<base64-encoded-PDF>" }),
        responses: {
          "200": jsonResponse("Resume stored.", "ResumeUploadResponse", { success: true, resume: { name: "resume.pdf", mimeType: "application/pdf", uploadedAt: "2026-10-15T12:00:00.000Z" } }),
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "403": errorRef("Forbidden"), "422": errorRef("UnprocessableEntity"), "500": errorRef("InternalServerError"),
        },
      },
      get: {
        tags: ["Profile"], summary: "Download the authenticated user's resume", operationId: "downloadResume",
        description: "Returns a PDF binary. The email query must match the bearer token's account.",
        security: bearer, parameters: [emailParameter],
        responses: {
          "200": { description: "PDF attachment.", content: { "application/pdf": { schema: { type: "string", format: "binary" } } }, headers: { "Content-Disposition": { schema: { type: "string" }, description: "Attachment filename." } } },
          "401": errorRef("Unauthorized"), "403": errorRef("Forbidden"), "404": errorRef("NotFound"), "500": errorRef("InternalServerError"),
        },
      },
      delete: {
        tags: ["Profile"], summary: "Delete the authenticated user's resume", operationId: "deleteResume",
        description: "Removes the PDF and its resume skill evidence. The email query must match the bearer token's account.",
        security: bearer, parameters: [emailParameter],
        responses: {
          "200": jsonResponse("Resume removed.", "SuccessResponse", { success: true }),
          "401": errorRef("Unauthorized"), "403": errorRef("Forbidden"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/verification/status": {
      get: {
        tags: ["Verification"], summary: "Get account verification status", operationId: "getVerificationStatus",
        description: "A temporary registration token is accepted while completing registration.", security: bearer,
        responses: {
          "200": jsonResponse("Verification status returned.", "VerificationStatus", { success: true, isVerified: false }),
          "401": errorRef("Unauthorized"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/verification/student-id": {
      post: {
        tags: ["Verification"], summary: "Verify a student ID image", operationId: "verifyStudentId",
        description: "Checks the recognized name and student ID against the authenticated account and stores a temporary face vector. Requires a valid JPG, PNG, or WEBP data URL smaller than 5 MB and an available InsightFace service.",
        security: bearer,
        requestBody: jsonBody("VerificationImageRequest", { image: "data:image/jpeg;base64,<base64-encoded-test-image>" }),
        responses: {
          "200": jsonResponse("Student ID accepted for face verification.", "StudentIdVerificationResponse", { success: true, idVerified: true }),
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "409": errorRef("Conflict"), "413": errorRef("PayloadTooLarge"), "422": errorRef("UnprocessableEntity"), "503": errorRef("ServiceUnavailable"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/verification/face": {
      post: {
        tags: ["Verification"], summary: "Complete camera face verification", operationId: "verifyStudentFace",
        description: "Compares a live camera image with the temporary student-ID face vector. A pending registration token finishes registration; an existing account token marks the account verified. Requires the InsightFace service.",
        security: bearer,
        requestBody: jsonBody("VerificationImageRequest", { image: "data:image/jpeg;base64,<base64-encoded-test-image>" }),
        responses: {
          "200": { description: "Face verified. Registration fields are included only when this completes a pending registration.", content: { "application/json": { schema: { $ref: "#/components/schemas/FaceVerificationResponse" }, examples: { verified: { value: { success: true, faceVerified: true } }, registrationComplete: { value: { success: true, faceVerified: true, registrationComplete: true, user: { id: "00000000-0000-4000-8000-000000000001", fullName: "Alex Sample", email: "alex.sample@example.test", isAdmin: false }, token: "bearer-token-returned-by-this-request" } } } } } },
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "409": errorRef("Conflict"), "413": errorRef("PayloadTooLarge"), "422": errorRef("UnprocessableEntity"), "503": errorRef("ServiceUnavailable"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/assessment/questions": {
      get: {
        tags: ["Assessment"], summary: "List assessment questions", operationId: "getAssessmentQuestions",
        description: "Public fixed question set with proficiency anchors.",
        responses: {
          "200": jsonResponse("Question set returned.", "AssessmentQuestionsResponse", { success: true, questions: [{ category: "Speaking", question: "How well do you convey information when you speak?", anchors: [{ level: 1, text: "Greet customers" }, { level: 3, text: "Interview applicants" }, { level: 5, text: "Argue a legal case" }] }] }),
          "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/assessment/latest": {
      get: {
        tags: ["Assessment"], summary: "Get the authenticated user's latest assessment", operationId: "getLatestAssessment",
        description: "Returns null attempt_id and an empty answers array if no attempt exists.", security: bearer,
        responses: {
          "200": jsonResponse("Latest attempt returned.", "AssessmentLatestResponse", { success: true, attempt_id: null, answers: [] }),
          "401": errorRef("Unauthorized"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/assessment/submit": {
      post: {
        tags: ["Assessment"], summary: "Submit assessment answers", operationId: "submitAssessment",
        description: "Requires one answer for each of the 18 categories and an integer level from 0 to 5. Saves the attempt and rebuilds the skill profile.",
        security: bearer,
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AssessmentAnswers" }, example: categories.map((category) => ({ category, level: 0 })) } } },
        responses: {
          "201": jsonResponse("Assessment saved.", "AssessmentSubmitResponse", { success: true, attempt_id: "00000000-0000-4000-8000-000000000001" }),
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/recommendations": {
      get: {
        tags: ["Recommendations"], summary: "Get personalized job and practicum matches", operationId: "getRecommendations",
        description: "Computes and persists the latest recommendation snapshot as part of this existing GET operation. Results may be empty without an assessment profile.",
        security: bearer,
        parameters: [
          { name: "limit", in: "query", description: "Positive result count; defaults to 20.", schema: { type: "integer", minimum: 1, default: 20 }, example: 10 },
          { name: "location", in: "query", description: "Optional location substring.", schema: { type: "string" }, example: "Manila" },
          { name: "type", in: "query", description: "Optional listing type.", schema: { type: "string", enum: ["job", "practicum"] } },
        ],
        responses: {
          "200": { description: "Recommendations computed.", content: { "application/json": { schema: { $ref: "#/components/schemas/RecommendationsResponse" }, examples: { results: { value: { results: [{ listing_id: 1, title: "Front Desk Associate", company: "Sample Hotel", location: "Manila", external_url: "https://example.test/jobs/front-desk", match_score: 0.82, match_percent: 82, readiness_pct: 75, gaps: [] }] } }, noProfile: { value: { code: "NO_PROFILE", results: [] } } } } } },
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/job-listings": {
      get: {
        tags: ["Recommendations"], summary: "List active database-backed job and practicum listings", operationId: "getJobListings",
        description: "Returns the current active listings from PostgreSQL, including manually entered and imported records, without fetching the live external Jobicy API on the frontend.",
        parameters: [
          { name: "limit", in: "query", description: "Positive result count; defaults to 50.", schema: { type: "integer", minimum: 1, default: 50 }, example: 20 },
          { name: "location", in: "query", description: "Optional location substring.", schema: { type: "string" }, example: "Cebu" },
          { name: "type", in: "query", description: "Optional listing type.", schema: { type: "string", enum: ["job", "practicum"] } },
        ],
        responses: {
          "200": jsonResponse("Active listings returned.", "JobListingsResponse", { success: true, jobs: [{ id: 1, title: "Front Desk Associate", company: "Sample Hotel", location: "Manila", employmentType: "Full-time", workType: "Remote", skills: ["Customer service"], summary: "Guest services.", url: "https://example.test/jobs/front-desk", logo: "", listingType: "job", source: "manual" }] }),
          "400": errorRef("BadRequest"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/admin/users": {
      get: {
        tags: ["Administration"], summary: "List user directory fields", operationId: "listAdminUsers",
        description: "Admin-only; returns names, student IDs, and email addresses.", security: bearer,
        responses: {
          "200": jsonResponse("Users returned.", "AdminUsersResponse", { success: true, users: [{ fullName: "Alex Sample", studentId: "PDM-2099-000001", email: "alex.sample@example.test" }] }),
          "401": errorRef("Unauthorized"), "403": errorRef("Forbidden"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/admin/jobs/fetch": {
      post: {
        tags: ["Administration"], summary: "Fetch and refresh Jobicy listings", operationId: "fetchAdminJobs",
        description: "Admin-only server-side import. Provide keywords and location for one fetch, or refreshAll: true to fetch every configured keyword, location, and result limit. Refresh-all requests wait the configured delay between keywords and rebuild listing vectors once.",
        security: bearer,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                oneOf: [
                  { $ref: "#/components/schemas/FetchJobsRequest" },
                  {
                    type: "object",
                    required: ["refreshAll"],
                    properties: { refreshAll: { type: "boolean", enum: [true] } },
                  },
                ],
              },
              examples: {
                oneKeyword: { value: { keywords: "hotel receptionist", location: "Philippines" } },
                allConfiguredKeywords: { value: { refreshAll: true } },
              },
            },
          },
        },
        responses: {
          "200": jsonResponse("Listings fetched and stored.", "FetchJobsResponse", { success: true, fetched: 1, inserted: 1, updated: 0, listingVectors: { listingCount: 1, zeroMatchedListingCount: 0, averageTextLength: 140, minimumTextLength: 140, listingSkillCount: 2, skillIdfCount: 10 } }),
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "403": errorRef("Forbidden"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/admin/job-listings/import": {
      post: {
        tags: ["Administration"], summary: "Import manual job or practicum listings", operationId: "importAdminListings",
        description: "Admin-only. Accepts 1 to 5,000 rows. Invalid rows are reported; accepted rows are upserted and listing vectors are rebuilt.", security: bearer,
        requestBody: jsonBody("ImportListingsRequest", { listings: [{ title: "Front Desk Associate", company: "Sample Hotel", location: "Manila", description: "Guest services role.", listing_type: "job", external_url: "https://example.test/jobs/front-desk" }] }),
        responses: {
          "200": jsonResponse("Import processed; row-level rejections are included.", "ImportListingsResponse", { success: true, inserted: 1, updated: 0, rejected: [], listingVectors: { listingCount: 1, zeroMatchedListingCount: 0, averageTextLength: 50, minimumTextLength: 50, listingSkillCount: 1, skillIdfCount: 10 } }),
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "403": errorRef("Forbidden"), "500": errorRef("InternalServerError"),
        },
      },
    },
    "/api/admin/users/import": {
      post: {
        tags: ["Administration"], summary: "Import student records", operationId: "importAdminUsers",
        description: "Admin-only. Accepts 1 to 5,000 rows. Each row needs a valid student ID; name and email are optional. Existing and duplicate records are skipped.", security: bearer,
        requestBody: jsonBody("ImportUsersRequest", { users: [{ fullName: "Alex Sample", studentId: "PDM-2099-000001", email: "alex.sample@example.test" }] }),
        responses: {
          "201": jsonResponse("Import processed.", "ImportUsersResponse", { success: true, importedCount: 1, skippedCount: 0 }),
          "400": errorRef("BadRequest"), "401": errorRef("Unauthorized"), "403": errorRef("Forbidden"), "500": errorRef("InternalServerError"),
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "Careera token", description: "Use a token returned by /api/login, /api/register, or completed registration. Do not use the InsightFace API key here." },
    },
    responses: {
      BadRequest: { description: "Invalid body or parameters.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "The request is invalid." } } } },
      Unauthorized: { description: "Authentication is missing, invalid, or expired.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "Sign in to continue." } } } },
      Forbidden: { description: "The account is not allowed to perform this operation.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "Admin access is required." } } } },
      NotFound: { description: "The requested user or resource was not found.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "The requested resource was not found." } } } },
      Conflict: { description: "Operation conflicts with the account or verification state.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "The operation conflicts with the current account state." } } } },
      UnprocessableEntity: { description: "Image, ID, face, or resume content could not be accepted.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "The supplied content could not be accepted." } } } },
      PayloadTooLarge: { description: "Request body exceeds the configured size limit.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "Request body is too large." } } } },
      ServiceUnavailable: { description: "Required upstream verification service is unavailable.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "The verification service is unavailable. Please try again." } } } },
      InternalServerError: { description: "Unexpected server error; internal details are not returned.", content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" }, example: { success: false, message: "An unexpected server error occurred." } } } },
    },
    schemas: {
      ApiError: { type: "object", required: ["success", "message"], properties: { success: { type: "boolean", enum: [false] }, message: { type: "string" } } },
      HealthResponse: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["ok"] } } },
      SuccessResponse: { type: "object", required: ["success"], properties: { success: { type: "boolean", enum: [true] } } },
      RegisterRequest: { type: "object", required: ["fullName", "studentId", "email", "password"], properties: { fullName: { type: "string", maxLength: 200 }, studentId: { type: "string", pattern: "^PDM-20\\d{2}-\\d{6}$" }, email: { type: "string", format: "email" }, password: { type: "string", minLength: 8, writeOnly: true } } },
      RegistrationPending: { type: "object", required: ["success", "registrationPending", "message", "token"], properties: { success: { type: "boolean", enum: [true] }, registrationPending: { type: "boolean", enum: [true] }, message: { type: "string" }, token: { type: "string" } } },
      LoginRequest: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string", writeOnly: true } } },
      LoginResponse: { type: "object", required: ["success", "user", "verificationRequired", "token"], properties: { success: { type: "boolean", enum: [true] }, user: { $ref: "#/components/schemas/PublicUser" }, verificationRequired: { type: "boolean" }, token: { type: "string" } } },
      PublicUser: { type: "object", required: ["id", "fullName", "email", "isAdmin"], properties: { id: { type: "string", format: "uuid" }, fullName: { type: "string" }, email: { type: "string", format: "email" }, isAdmin: { type: "boolean" } } },
      ProfileResponse: { type: "object", required: ["success", "user", "resume"], properties: { success: { type: "boolean", enum: [true] }, user: { type: "object", required: ["fullName", "email"], properties: { fullName: { type: "string" }, email: { type: "string", format: "email" } } }, resume: { allOf: [{ $ref: "#/components/schemas/ResumeSummary" }], nullable: true } } },
      ResumeSummary: { type: "object", required: ["name", "mimeType", "uploadedAt"], properties: { name: { type: "string" }, mimeType: { type: "string", enum: ["application/pdf"] }, uploadedAt: { type: "string", format: "date-time" } } },
      ResumeUploadRequest: { type: "object", required: ["email", "fileName", "contentBase64"], properties: { email: { type: "string", format: "email", description: "Must match the bearer token's account." }, fileName: { type: "string" }, contentBase64: { type: "string", description: "Base64 PDF, under 5 MB before encoding." } } },
      ResumeUploadResponse: { type: "object", required: ["success", "resume"], properties: { success: { type: "boolean", enum: [true] }, resume: { $ref: "#/components/schemas/ResumeSummary" } } },
      VerificationStatus: { type: "object", required: ["success", "isVerified"], properties: { success: { type: "boolean", enum: [true] }, isVerified: { type: "boolean" } } },
      VerificationImageRequest: { type: "object", required: ["image"], properties: { image: { type: "string", description: "JPG, PNG, or WEBP data URL smaller than 5 MB; successful checks require an image matching the authenticated user.", example: "data:image/jpeg;base64,<base64-encoded-test-image>" } } },
      StudentIdVerificationResponse: { type: "object", required: ["success", "idVerified"], properties: { success: { type: "boolean", enum: [true] }, idVerified: { type: "boolean", enum: [true] } } },
      FaceVerificationResponse: { type: "object", required: ["success", "faceVerified"], properties: { success: { type: "boolean", enum: [true] }, faceVerified: { type: "boolean", enum: [true] }, registrationComplete: { type: "boolean" }, user: { $ref: "#/components/schemas/PublicUser" }, token: { type: "string" } } },
      AssessmentQuestion: { type: "object", required: ["category", "question", "anchors"], properties: { category: { type: "string" }, question: { type: "string" }, anchors: { type: "array", items: { type: "object", required: ["level", "text"], properties: { level: { type: "integer", enum: [1, 3, 5] }, text: { type: "string" } } } } } },
      AssessmentQuestionsResponse: { type: "object", required: ["success", "questions"], properties: { success: { type: "boolean", enum: [true] }, questions: { type: "array", items: { $ref: "#/components/schemas/AssessmentQuestion" } } } },
      AssessmentAnswer: { type: "object", required: ["category", "level"], properties: { category: { type: "string", enum: categories }, level: { type: "integer", minimum: 0, maximum: 5 } } },
      AssessmentAnswers: { type: "array", minItems: 18, maxItems: 18, description: "Every category must appear exactly once.", items: { $ref: "#/components/schemas/AssessmentAnswer" } },
      AssessmentLatestResponse: { type: "object", required: ["success", "attempt_id", "answers"], properties: { success: { type: "boolean", enum: [true] }, attempt_id: { type: "string", format: "uuid", nullable: true }, answers: { type: "array", items: { $ref: "#/components/schemas/AssessmentAnswer" } } } },
      AssessmentSubmitResponse: { type: "object", required: ["success", "attempt_id"], properties: { success: { type: "boolean", enum: [true] }, attempt_id: { type: "string", format: "uuid" }, warning: { type: "string" } } },
      RecommendationsResponse: { oneOf: [{ type: "object", required: ["results"], properties: { results: { type: "array", items: { $ref: "#/components/schemas/Recommendation" } } } }, { type: "object", required: ["code", "results"], properties: { code: { type: "string", enum: ["NO_PROFILE"] }, results: { type: "array", maxItems: 0, items: { type: "object" } } } }] },
      Recommendation: { type: "object", required: ["listing_id", "title", "company", "location", "external_url", "match_score", "match_percent", "readiness_pct", "gaps"], properties: { listing_id: { type: "integer" }, title: { type: "string" }, company: { type: "string", nullable: true }, location: { type: "string", nullable: true }, external_url: { type: "string", format: "uri", nullable: true }, match_score: { type: "number" }, match_percent: { type: "integer" }, readiness_pct: { type: "number", nullable: true }, gaps: { type: "array", items: { type: "object", required: ["skill_id", "name", "listing_weight", "user_weight"], properties: { skill_id: { type: "string" }, name: { type: "string" }, listing_weight: { type: "number" }, user_weight: { type: "number" } } } } } },
      JobListingsResponse: { type: "object", required: ["success", "jobs"], properties: { success: { type: "boolean", enum: [true] }, jobs: { type: "array", items: { $ref: "#/components/schemas/JobListingSummary" } } } },
      JobListingSummary: { type: "object", required: ["id", "title", "company", "location", "employmentType", "workType", "skills", "summary", "url", "logo", "listingType", "source"], properties: { id: { type: "integer" }, title: { type: "string" }, company: { type: "string" }, location: { type: "string" }, employmentType: { type: "string" }, workType: { type: "string" }, skills: { type: "array", items: { type: "string" } }, summary: { type: "string" }, url: { type: "string", format: "uri" }, logo: { type: "string", nullable: true }, listingType: { type: "string", enum: ["job", "practicum"] }, source: { type: "string" } } },
      AdminUsersResponse: { type: "object", required: ["success", "users"], properties: { success: { type: "boolean", enum: [true] }, users: { type: "array", items: { type: "object", properties: { fullName: { type: "string", nullable: true }, studentId: { type: "string", nullable: true }, email: { type: "string", format: "email", nullable: true } } } } } },
      FetchJobsRequest: { type: "object", required: ["keywords", "location"], properties: { keywords: { type: "string", minLength: 1 }, location: { type: "string", minLength: 1 } } },
      ListingVectorReport: { type: "object", properties: { listingCount: { type: "integer" }, zeroMatchedListingCount: { type: "integer" }, averageTextLength: { type: "number", nullable: true }, minimumTextLength: { type: "integer", nullable: true }, topFrequentSkills: { type: "array", items: { type: "object" } }, skillsWithoutListings: { type: "array", items: { type: "object" } }, listingSkillCount: { type: "integer" }, skillIdfCount: { type: "integer" } } },
      FetchJobsResponse: { type: "object", required: ["success", "fetched", "inserted", "updated", "listingVectors"], properties: { success: { type: "boolean", enum: [true] }, fetched: { type: "integer" }, inserted: { type: "integer" }, updated: { type: "integer" }, listingVectors: { $ref: "#/components/schemas/ListingVectorReport" } } },
      ImportListing: { type: "object", required: ["title", "company", "location", "description", "listing_type", "external_url"], properties: { title: { type: "string", minLength: 1 }, company: { type: "string", minLength: 1 }, location: { type: "string", minLength: 1 }, description: { type: "string", minLength: 1 }, listing_type: { type: "string", enum: ["job", "practicum"] }, external_url: { type: "string", format: "uri" }, _rowNumber: { type: "integer" } } },
      ImportListingsRequest: { type: "object", required: ["listings"], properties: { listings: { type: "array", minItems: 1, maxItems: 5000, items: { $ref: "#/components/schemas/ImportListing" } } } },
      RejectedListing: { type: "object", required: ["row", "reason"], properties: { row: { type: "integer" }, reason: { type: "string" } } },
      ImportListingsResponse: { type: "object", required: ["success", "inserted", "updated", "rejected", "listingVectors"], properties: { success: { type: "boolean", enum: [true] }, inserted: { type: "integer" }, updated: { type: "integer" }, rejected: { type: "array", items: { $ref: "#/components/schemas/RejectedListing" } }, listingVectors: { $ref: "#/components/schemas/ListingVectorReport" } } },
      ImportUser: { type: "object", required: ["studentId"], properties: { fullName: { type: "string", maxLength: 200, nullable: true }, studentId: { type: "string", pattern: "^PDM-20\\d{2}-\\d{6}$" }, email: { type: "string", format: "email", nullable: true } } },
      ImportUsersRequest: { type: "object", required: ["users"], properties: { users: { type: "array", minItems: 1, maxItems: 5000, items: { $ref: "#/components/schemas/ImportUser" } } } },
      ImportUsersResponse: { type: "object", required: ["success", "importedCount", "skippedCount"], properties: { success: { type: "boolean", enum: [true] }, importedCount: { type: "integer" }, skippedCount: { type: "integer" } } },
    },
  },
};

export default spec;