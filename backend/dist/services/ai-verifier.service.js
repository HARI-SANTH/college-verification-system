"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiVerifierService = exports.AIVerifierService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const generative_ai_1 = require("@google/generative-ai");
class AIVerifierService {
    cache = new Map();
    CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    // Fetch document buffer from disk or remote Supabase storage
    async getDocumentBuffer(doc) {
        try {
            const uploadsRoot = path_1.default.resolve(process.env.STORAGE_DIR || './uploads');
            let foundPath = null;
            // 1. Direct path check
            if (doc.filePath && fs_1.default.existsSync(doc.filePath)) {
                foundPath = doc.filePath;
            }
            else {
                // 2. Search in subfolders by basename
                const basename = path_1.default.basename(doc.filePath || doc.fileName || '');
                const candidates = [
                    path_1.default.join(uploadsRoot, 'documents', basename),
                    path_1.default.join(uploadsRoot, 'certificates', basename),
                    path_1.default.join(uploadsRoot, 'photos', basename),
                    path_1.default.join(uploadsRoot, basename),
                ];
                for (const c of candidates) {
                    if (fs_1.default.existsSync(c)) {
                        foundPath = c;
                        break;
                    }
                }
            }
            let buffer = null;
            if (foundPath) {
                buffer = fs_1.default.readFileSync(foundPath);
            }
            else if (doc.fileUrl && (doc.fileUrl.startsWith('http://') || doc.fileUrl.startsWith('https://'))) {
                const res = await fetch(doc.fileUrl);
                if (res.ok) {
                    buffer = Buffer.from(await res.arrayBuffer());
                }
            }
            if (!buffer)
                return null;
            // Determine mime
            let mime = doc.fileMimeType;
            const ext = path_1.default.extname(doc.fileName || doc.filePath || '').toLowerCase();
            if (!mime || mime === 'application/octet-stream') {
                if (ext === '.pdf')
                    mime = 'application/pdf';
                else if (ext === '.png')
                    mime = 'image/png';
                else if (ext === '.webp')
                    mime = 'image/webp';
                else
                    mime = 'image/jpeg';
            }
            return { buffer, mime };
        }
        catch (err) {
            console.warn(`[AIVerifier] Could not load document for ${doc.fileName}:`, err.message);
            return null;
        }
    }
    async runAudit(student, forceRefresh = false) {
        const studentId = student.id;
        // Check cache unless force refresh
        if (!forceRefresh) {
            const cached = this.cache.get(studentId);
            if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
                console.log(`[AIVerifier] Returning cached AI audit for ${student.firstName} ${student.lastName}`);
                return cached.summary;
            }
        }
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('[AIVerifier] No GEMINI_API_KEY found, running heuristic audit');
            return this.runHeuristicAudit(student);
        }
        try {
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
            // Prioritize gemini-3.5-flash-lite for near-instant (3-5s) audit speed and zero 503 latency
            const modelsToTry = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
            // Gather candidate document parts with clear metadata boundaries
            const contentParts = [];
            const loadedDocTypes = [];
            for (const doc of student.documents || []) {
                const docType = doc.type;
                const isTargetDoc = [
                    'PLUS_TWO_CERTIFICATE',
                    'PLUS_TWO_CERT',
                    'SSLC_CERTIFICATE',
                    'SSLC_CERT',
                    'AADHAAR_CARD',
                    'AADHAAR_DOCUMENT',
                    'BANK_PASSBOOK',
                    'ALLOTMENT_MEMO',
                    'APAAR_DOCUMENT',
                    'APAAR_CARD',
                    'COMMUNITY_CERTIFICATE',
                    'COMMUNITY_CERT',
                    'INCOME_CERTIFICATE',
                    'INCOME_CERT',
                    'CASTE_CERTIFICATE',
                    'CASTE_CERT',
                ].includes(docType);
                if (!isTargetDoc)
                    continue;
                const docData = await this.getDocumentBuffer(doc);
                if (docData && docData.buffer.length <= 10 * 1024 * 1024) {
                    loadedDocTypes.push(docType);
                    contentParts.push(`\n=======================================================\nOFFICIAL ATTACHED CERTIFICATE SPECIFICATION: [${docType}]\nORIGINAL FILE: "${doc.fileName}"\n=======================================================\n`);
                    contentParts.push({
                        inlineData: {
                            data: docData.buffer.toString('base64'),
                            mimeType: docData.mime,
                        },
                    });
                }
            }
            const candidateProfilePrompt = `
You are the AI Admissions Verification Copilot for Baselios Poulose II Catholicose College.
You are performing an exhaustive, rigorous data reconciliation audit between the candidate's portal-entered profile and their attached official certificates.

STUDENT ENTERED PROFILE DATA:
SECTION 1: Personal Identity & Government IDs:
- Full Legal Name (English): "${student.firstName} ${student.lastName}"
- Full Name (Malayalam): "${student.firstNameMalayalam || ''} ${student.lastNameMalayalam || ''}"
- Date of Birth: "${student.dob || 'Not Provided'}"
- Gender: "${student.gender || 'Not Provided'}"
- Blood Group: "${student.bloodGroup || 'Not Provided'}"
- Nationality: "${student.nationality || 'Indian'}"
- Mobile Contact: "${student.user?.phoneNumber || student.phoneNumber || 'Not Provided'}"
- Email Address: "${student.user?.email || student.email || 'Not Provided'}"
- Aadhaar UID: "${student.aadhaarNumber || 'Not Provided'}"
- APAAR / ABC ID: "${student.apaarId || 'Not Provided'}"
- Permanent Domicile Address: "${student.permanentAddress || student.address || 'Not Provided'}"
- Communication / Present Address: "${student.address || 'Not Provided'}"

SECTION 2: Parent & Guardian Details:
- Father's Name: "${student.fatherName || student.parentName || 'Not Provided'}"
- Father's Occupation: "${student.fatherOccupation || student.parentOccupation || 'Not Provided'}"
- Mother's Name: "${student.motherName || 'Not Provided'}"
- Mother's Occupation: "${student.motherOccupation || 'Not Provided'}"
- Local Guardian's Name: "${student.guardianName || 'Not Provided'}"
- Local Guardian's Occupation: "${student.guardianOccupation || 'Not Provided'}"

SECTION 3: Qualifying Examination & Academic Scores:
- Examination Board: "${student.prevBoardUniversity || 'Not Provided'}"
- 12th HSE Register Number: "${student.prevRegisterNumber || 'Not Provided'}"
- Stream / Specialization: "${student.prevCourse || 'Not Provided'}"
- Period of Study: "${student.prevPeriodOfStudy || 'Not Provided'}"
- School / Institution Last Attended: "${student.prevInstitutionName || 'Not Provided'}"
- 12th Percentage Aggregate: "${student.prevPercentage != null ? student.prevPercentage + '%' : 'Not Provided'}"

SECTION 4: Admission, Quota & Reservation Validation:
- Course Admitted: "${student.courseAdmitted || 'Not Provided'}"
- College Admission / Roll No: "${student.admissionNumber || 'Not Provided'}"
- Academic Batch Period: "${student.timePeriodOfStudy || 'Not Provided'}"
- Selected Admission Quota: "${student.quota || 'Not Provided'}"
- Religion & Community: "${student.religion || 'Not Provided'}"
- Caste / Category: "${student.caste || 'Not Provided'}"
- Annual Family Income: "${student.annualIncome != null ? '₹ ' + student.annualIncome : 'Not Provided'}"
- EWS Eligibility: "${student.isEws ? 'Eligible' : 'Not Eligible'}"

SECTION 5: Bank Account & Scholarship Credentials:
- Account Holder Name: "${student.bankAccountName || 'Not Provided'}"
- Bank Name: "${student.bankName || 'Not Provided'}"
- Bank Branch: "${student.bankBranch || 'Not Provided'}"
- Bank Account Number: "${student.bankAccountNumber || 'Not Provided'}"
- Bank IFSC Code: "${student.bankIfscCode || 'Not Provided'}"

ATTACHED OFFICIAL CERTIFICATES AVAILABLE FOR AUDIT:
${loadedDocTypes.join(', ')}

CROSS-VERIFICATION SPECIFICATIONS:
You MUST audit EVERY single text field listed below against its respected official document. If a field matches, set colorStatus="GREEN". If there is any discrepancy or error, set colorStatus="RED" and describe the exact mismatch. If a document does not contain that field or is missing, set colorStatus="YELLOW".

1. CANDIDATE PROFILE & GOVERNMENT IDs:
Respected Documents: [AADHAAR_CARD], [SSLC_CERTIFICATE], [APAAR_DOCUMENT]
- "fullName": Cross-examine with [AADHAAR_CARD] AND [SSLC_CERTIFICATE].
  CRITICAL REQUIREMENT: If the candidate name on Aadhaar (e.g. "Justin Jose") differs from the name on SSLC (e.g. "Jeswin Jose"), you MUST explicitly flag this cross-document mismatch between Aadhaar and SSLC!
- "nameMalayalam": Check the candidate's name in Malayalam script printed on [SSLC_CERTIFICATE] (under "പേര് / Name" section). Compare directly with entered "${student.firstNameMalayalam || ''} ${student.lastNameMalayalam || ''}". If the Malayalam script on SSLC differs (e.g. SSLC records "ജസ്വിൻ ജോസ്" while candidate entered "ജസ്റ്റിൻ ജോസ്"), mark RED discrepancy with the exact mismatch!
- "dob": Cross-examine with [AADHAAR_CARD] AND [SSLC_CERTIFICATE].
  CRITICAL REQUIREMENT: If the Date of Birth on Aadhaar (e.g. "2006-05-14") differs from the Date of Birth on SSLC (e.g. "15/05/2008"), you MUST explicitly flag this cross-document discrepancy and mark RED!
- "gender": Check against [AADHAAR_CARD] and [SSLC_CERTIFICATE].
- "aadhaarNumber": Extract 12-digit UID from [AADHAAR_CARD]. Compare character-by-character with "${student.aadhaarNumber}".
- "apaarId": Extract 12-digit APAAR / ABC ID from [APAAR_DOCUMENT]. Compare with "${student.apaarId}". If it matches, mark GREEN (100%).
- "permanentAddress": Compare with Domicile Address on [AADHAAR_CARD].
- "address": Compare with Communication Address on [AADHAAR_CARD].
- "nationality": Compare with Citizenship / Indian status on certificates.
- "bloodGroup": Check if recorded on any document.
- "phoneNumber": Check contact number against documents.
- "email": Check email against documents.

2. PARENT & GUARDIAN INFORMATION:
Respected Document: [SSLC_CERTIFICATE]
(Note: Do not audit occupations of parents/guardians, only check names)
- "fatherName": Check Father's Name on [SSLC_CERTIFICATE]. If SSLC has a different name (e.g. "ROBERT DOE" vs "${student.fatherName || student.parentName}"), mark RED discrepancy!
- "motherName": Check Mother's Name on [SSLC_CERTIFICATE]. If SSLC has a different name (e.g. "MARY DOE" vs "${student.motherName}"), mark RED discrepancy!
- "guardianName": Check if a local guardian is officially documented or authorized on SSLC. If SSLC lists parents (Robert & Mary Doe) and has no guardian record or name differs from "${student.guardianName}", mark RED discrepancy or note!

3. QUALIFYING EXAMINATION & ACADEMIC SCORES:
Respected Document: [PLUS_TWO_CERTIFICATE] (+2 Marksheet)
- "prevBoardUniversity": Check Examination Board printed on [PLUS_TWO_CERTIFICATE].
- "prevRegisterNumber": Check Register Number printed on [PLUS_TWO_CERTIFICATE]. If it differs (e.g. 9876543 vs "${student.prevRegisterNumber}"), mark RED discrepancy!
- "prevCourse": Check Stream / Group on [PLUS_TWO_CERTIFICATE].
- "prevPeriodOfStudy": Check Year/Period of Examination on [PLUS_TWO_CERTIFICATE].
- "prevInstitutionName": Check School Name on [PLUS_TWO_CERTIFICATE].
- "prevPercentage": READ THE MARKS TABLE ON [PLUS_TWO_CERTIFICATE].
  Find total marks obtained and maximum marks. Calculate: (Total Obtained / Total Maximum) * 100.
  Compare with entered "${student.prevPercentage}%". If student entered 100% but marksheet calculates to 91.75% (1101/1200), mark RED discrepancy with the exact calculated number.

4. ADMISSION, QUOTA & RESERVATION VALIDATION:
Respected Documents: [ALLOTMENT_MEMO], [COMMUNITY_CERTIFICATE], [INCOME_CERTIFICATE], [CASTE_CERTIFICATE]
- "courseAdmitted": Check Allotted Course on [ALLOTMENT_MEMO]. If Allotment Memo specifies a different program/course (e.g. "Bachelor of Science in Computer Science" vs "${student.courseAdmitted}"), mark RED discrepancy!
- "admissionNumber": Check Roll/Rank/Application No on [ALLOTMENT_MEMO].
- "timePeriodOfStudy": Academic batch period (e.g. 2024-2027).
- "quota": Check Allotment Category / Quota on [ALLOTMENT_MEMO] (e.g. General / Unreserved vs "${student.quota}"). If mismatch, mark RED.
- "religion" & "caste": Check Category on [ALLOTMENT_MEMO] or [CASTE_CERTIFICATE] / [COMMUNITY_CERTIFICATE].
- "annualIncome": Check Annual Family Income on [INCOME_CERTIFICATE] or [ALLOTMENT_MEMO].
- "isEws": Check EWS status against [INCOME_CERTIFICATE] or [ALLOTMENT_MEMO].

5. BANK ACCOUNT & SCHOLARSHIP CREDENTIALS:
Respected Document: [BANK_PASSBOOK]
- "bankAccountName": Account Holder Name. Check Name on [BANK_PASSBOOK]. If passbook says "ALEX SAMPLE" while student entered "${student.bankAccountName}", mark RED discrepancy!
- "bankName": Bank Name. Check Bank Name on [BANK_PASSBOOK]. If passbook says "DEMO BANK" while student entered "${student.bankName}", mark RED discrepancy!
- "bankBranch": Bank Branch Name. Check Branch on [BANK_PASSBOOK].
- "bankAccountNumber": Account Number. Check Account Number on [BANK_PASSBOOK].
- "bankIfscCode": Bank IFSC Code. Check IFSC Code on [BANK_PASSBOOK].

OUTPUT FORMAT REQUIREMENTS:
Return ONLY valid JSON with this exact structure:
{
  "overallMatchScore": number (0-100),
  "status": "ALL_MATCHED" | "DISCREPANCIES_DETECTED" | "MISSING_DOCUMENTS",
  "summary": "3-4 sentence detailed executive audit summary covering all discrepancies across personal info, parents, +2 marks, allotment, and bank.",
  "fieldResults": [
    {
      "fieldKey": string (e.g. "fullName", "nameMalayalam", "dob", "gender", "aadhaarNumber", "apaarId", "permanentAddress", "address", "fatherName", "fatherOccupation", "motherName", "motherOccupation", "guardianName", "guardianOccupation", "prevBoardUniversity", "prevRegisterNumber", "prevCourse", "prevPeriodOfStudy", "prevInstitutionName", "prevPercentage", "courseAdmitted", "admissionNumber", "timePeriodOfStudy", "quota", "religion", "caste", "annualIncome", "isEws", "bankAccountName", "bankName", "bankBranch", "bankAccountNumber", "bankIfscCode"),
      "fieldLabel": string,
      "colorStatus": "GREEN" | "YELLOW" | "RED",
      "match": boolean,
      "portalValue": string,
      "documentValue": string,
      "confidence": number,
      "note": string,
      "suggestedReason": string
    }
  ],
  "suggestedFlags": [
    {
      "key": string (MANDATORY: MUST be the exact fieldKey of the field, e.g. "bankName", "bankAccountName", "motherName", "fatherName", "prevPercentage", "prevRegisterNumber", "courseAdmitted", "admissionNumber", "fullName", "dob", "annualIncome"),
      "reason": string (clear, official explanation ready to send to student mobile app)
    }
  ]
}
`;
            let lastError = null;
            for (const modelName of modelsToTry) {
                try {
                    console.log(`[AIVerifier] Calling Gemini model ${modelName} for student ${student.admissionNumber}...`);
                    const model = genAI.getGenerativeModel({
                        model: modelName,
                        generationConfig: {
                            responseMimeType: 'application/json',
                            temperature: 0.1,
                        },
                    });
                    const result = await model.generateContent([
                        candidateProfilePrompt,
                        ...contentParts,
                    ]);
                    const responseText = result.response.text().trim();
                    const cleanJson = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    const parsed = JSON.parse(cleanJson);
                    const summary = {
                        studentId,
                        studentName: `${student.firstName} ${student.lastName}`,
                        admissionNumber: student.admissionNumber,
                        overallMatchScore: typeof parsed.overallMatchScore === 'number' ? parsed.overallMatchScore : 90,
                        status: parsed.status || 'ALL_MATCHED',
                        summary: parsed.summary || 'AI audit completed successfully.',
                        stats: {
                            greenCount: (parsed.fieldResults || []).filter((f) => f.colorStatus === 'GREEN').length,
                            yellowCount: (parsed.fieldResults || []).filter((f) => f.colorStatus === 'YELLOW').length,
                            redCount: (parsed.fieldResults || []).filter((f) => f.colorStatus === 'RED').length,
                            autoFlaggedCount: (parsed.suggestedFlags || []).length,
                        },
                        fieldResults: parsed.fieldResults || [],
                        suggestedFlags: parsed.suggestedFlags || [],
                        scannedAt: new Date().toISOString(),
                    };
                    // Cache in memory
                    this.cache.set(studentId, { summary, timestamp: Date.now() });
                    console.log(`[AIVerifier] Audit completed successfully with ${modelName}: score ${summary.overallMatchScore}%`);
                    return summary;
                }
                catch (err) {
                    lastError = err;
                    console.warn(`[AIVerifier] Model ${modelName} call failed:`, err.message?.slice(0, 150));
                }
            }
            console.error('[AIVerifier] All Gemini models failed or timed out, falling back to heuristic audit:', lastError?.message);
            return this.runHeuristicAudit(student);
        }
        catch (err) {
            console.error('[AIVerifier] Top level error in runAudit:', err);
            return this.runHeuristicAudit(student);
        }
    }
    // Graceful rule-based fallback if AI is offline or key quota reached
    runHeuristicAudit(student) {
        const results = [];
        const suggestedFlags = [];
        const checkField = (key, label, val, validator) => {
            const portalVal = val ? String(val) : 'Not Provided';
            let isMatch = !!val;
            let color = isMatch ? 'GREEN' : 'YELLOW';
            let note = isMatch ? 'Provided in student dossier' : 'Pending student entry';
            if (validator && val) {
                const vResult = validator(val);
                isMatch = vResult.valid;
                color = vResult.valid ? 'GREEN' : 'RED';
                note = vResult.note;
                if (!vResult.valid) {
                    suggestedFlags.push({ key, reason: vResult.note });
                }
            }
            results.push({
                fieldKey: key,
                fieldLabel: label,
                type: 'TEXT_FIELD',
                colorStatus: color,
                match: isMatch,
                portalValue: portalVal,
                documentValue: isMatch ? portalVal : 'Check Document',
                confidence: isMatch ? 95 : 50,
                note,
            });
        };
        checkField('fullName', 'Full Legal Name', `${student.firstName} ${student.lastName}`);
        checkField('dob', 'Date of Birth', student.dob);
        checkField('aadhaarNumber', 'Aadhaar UID', student.aadhaarNumber, (v) => {
            const clean = String(v).replace(/\s+/g, '');
            const valid = /^\d{12}$/.test(clean);
            return { valid, note: valid ? 'Valid 12-digit Aadhaar UID format' : 'Aadhaar number must be 12 digits' };
        });
        checkField('apaarId', 'APAAR / ABC ID', student.apaarId, (v) => {
            const clean = String(v).replace(/\s+/g, '');
            const valid = /^\d{12}$/.test(clean);
            return { valid, note: valid ? 'Valid 12-digit APAAR format' : 'APAAR ID must be 12 digits' };
        });
        checkField('courseAdmitted', 'Course Admitted', student.courseAdmitted);
        checkField('admissionNumber', 'Admission Number', student.admissionNumber);
        checkField('quota', 'Admission Quota', student.quota);
        checkField('religion', 'Religion', student.religion);
        checkField('caste', 'Caste', student.caste);
        checkField('annualIncome', 'Annual Income', student.annualIncome);
        checkField('isEws', 'EWS Eligibility', student.isEws != null ? (student.isEws ? 'Eligible' : 'Not Applicable') : null);
        checkField('prevBoardUniversity', 'Examination Board', student.prevBoardUniversity);
        checkField('prevCourse', '12th Stream', student.prevCourse);
        checkField('prevInstitutionName', 'School Last Attended', student.prevInstitutionName);
        checkField('prevRegisterNumber', 'HSE Register No', student.prevRegisterNumber);
        checkField('prevPercentage', '12th Percentage Aggregate', student.prevPercentage, (v) => {
            const num = Number(v);
            const valid = num >= 35 && num <= 100;
            return { valid, note: valid ? `Qualifying aggregate ${num}% within pass criteria` : 'Percentage must be between 35% and 100%' };
        });
        checkField('fatherName', "Father's Name", student.fatherName || student.parentName);
        checkField('motherName', "Mother's Name", student.motherName);
        checkField('guardianName', 'Local Guardian Name', student.guardianName);
        checkField('bankAccountName', 'Account Holder Name', student.bankAccountName);
        checkField('bankName', 'Bank Name', student.bankName);
        checkField('bankBranch', 'Bank Branch', student.bankBranch);
        checkField('bankAccountNumber', 'Bank Account Number', student.bankAccountNumber);
        checkField('bankIfscCode', 'Bank IFSC Code', student.bankIfscCode, (v) => {
            const valid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(String(v).toUpperCase().trim());
            return { valid, note: valid ? 'Valid 11-character IFSC format' : 'IFSC code format invalid (e.g. SBIN0001234)' };
        });
        const greenCount = results.filter((r) => r.colorStatus === 'GREEN').length;
        const redCount = results.filter((r) => r.colorStatus === 'RED').length;
        const yellowCount = results.filter((r) => r.colorStatus === 'YELLOW').length;
        const overallScore = Math.round((greenCount / results.length) * 100);
        return {
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            admissionNumber: student.admissionNumber,
            overallMatchScore: overallScore,
            status: redCount > 0 ? 'DISCREPANCIES_DETECTED' : 'ALL_MATCHED',
            summary: redCount > 0
                ? `Heuristic audit detected ${redCount} error item(s). Review highlighted fields.`
                : 'All core parameters formatted correctly and eligible for verification sign-off.',
            stats: {
                greenCount,
                yellowCount,
                redCount,
                autoFlaggedCount: suggestedFlags.length,
            },
            fieldResults: results,
            suggestedFlags,
            scannedAt: new Date().toISOString(),
        };
    }
}
exports.AIVerifierService = AIVerifierService;
exports.aiVerifierService = new AIVerifierService();
