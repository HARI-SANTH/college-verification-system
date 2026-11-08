"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentType = exports.VerificationStatus = exports.Role = void 0;
var Role;
(function (Role) {
    Role["STUDENT"] = "STUDENT";
    Role["ADMIN"] = "ADMIN";
    Role["SUPER_ADMIN"] = "SUPER_ADMIN";
})(Role || (exports.Role = Role = {}));
var VerificationStatus;
(function (VerificationStatus) {
    VerificationStatus["DRAFT"] = "DRAFT";
    VerificationStatus["SUBMITTED"] = "SUBMITTED";
    VerificationStatus["CORRECTION_REQUIRED"] = "CORRECTION_REQUIRED";
    VerificationStatus["VERIFIED"] = "VERIFIED";
})(VerificationStatus || (exports.VerificationStatus = VerificationStatus = {}));
var DocumentType;
(function (DocumentType) {
    DocumentType["PROFILE_PHOTO"] = "PROFILE_PHOTO";
    DocumentType["PLUS_TWO_CERTIFICATE"] = "PLUS_TWO_CERTIFICATE";
    DocumentType["SSLC_CERTIFICATE"] = "SSLC_CERTIFICATE";
    DocumentType["ALLOTMENT_MEMO"] = "ALLOTMENT_MEMO";
    DocumentType["CASTE_CERTIFICATE"] = "CASTE_CERTIFICATE";
    DocumentType["INCOME_CERTIFICATE"] = "INCOME_CERTIFICATE";
    DocumentType["COMMUNITY_CERTIFICATE"] = "COMMUNITY_CERTIFICATE";
    DocumentType["BANK_PASSBOOK"] = "BANK_PASSBOOK";
    DocumentType["APAAR_DOCUMENT"] = "APAAR_DOCUMENT";
    DocumentType["AADHAAR_CARD"] = "AADHAAR_CARD";
})(DocumentType || (exports.DocumentType = DocumentType = {}));
