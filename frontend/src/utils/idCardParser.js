/**
 * idCardParser.js
 * Pattern recognition engine for College & Student Identity Cards (specifically tailored
 * for Harsha Institutions and standard academic ID card formats).
 */

export function parseIdCardText(ocrText = '') {
  if (!ocrText || typeof ocrText !== 'string') {
    return {};
  }

  const raw = ocrText;
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cleanText = raw.replace(/\r?\n/g, ' ');

  const result = {
    institution: '',
    name: '',
    studentIdNumber: '',
    department: '',
    batch: '',
    bloodGroup: '',
    validUpto: '',
    phone: '',
    emergencyContact: '',
    fatherName: '',
    motherName: '',
    rawText: ocrText
  };

  // 1. Institution Pattern (Harsha Institutions or similar)
  if (/HARSHA\s*INSTITUTIONS?/i.test(cleanText)) {
    result.institution = 'Harsha Institutions';
  } else if (/HARSHA\s*INSTITUTE\s*OF\s*MANAGEMENT/i.test(cleanText)) {
    result.institution = 'Harsha Institute of Management Studies';
  } else if (/HARSHA\s*INSTITUTE\s*OF\s*TECH/i.test(cleanText)) {
    result.institution = 'Harsha Institute of Technology';
  }

  // 2. Student ID / Roll Number Pattern
  // Example on card: "23BC023" (23 = Year, BC = BCA, 023 = Roll No)
  // College roll numbers: 23BC023, 23BC 023, 24MCA001, etc.
  const rawIdMatch =
    cleanText.match(/\b(2[0-9]\s*[-/]?\s*[A-Z]{2,4}\s*[-/]?\s*[0-9O]{2,4})\b/i) ||
    cleanText.match(/\b([0-9]{2}\s*[-/]?\s*[A-Z]{2,4}\s*[-/]?\s*[0-9O]{2,4})\b/i) ||
    cleanText.match(/(?:Roll\s*(?:No\.?|Number)|Enroll?\s*(?:No\.?|Number)|Student\s*ID|Reg\s*(?:No\.?|Number)|Id\s*No\.?)[:\s.-]*([A-Z0-9\/-]+)/i);

  if (rawIdMatch) {
    let extracted = rawIdMatch[1].replace(/[\s\/-]+/g, '').toUpperCase();
    // Correct OCR mistaking 0 for O in trailing digits, e.g. 23BCO23 -> 23BC023
    extracted = extracted.replace(/^([0-9]{2}[A-Z]{2,4})O([0-9]+)$/, '$10$2');
    result.studentIdNumber = extracted;
  }

  // 3. Name Pattern
  // On Harsha ID card: Below "HARSHA INSTITUTIONS", line with "ABIN K R"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if line looks like an all-caps student name (e.g. "ABIN K R" or "ABIN K.R.")
    if (
      !result.name &&
      /^[A-Z\s.]{3,35}$/.test(line) &&
      !/HARSHA|INSTITUTION|COLLEGE|HOUSE|PALAKKAD|KERALA|BLOOD|GROUP|BATCH|VALID|BACHELOR/i.test(line)
    ) {
      result.name = line;
      break;
    }
  }

  // Fallback explicit name search
  if (!result.name) {
    const nameMatch = cleanText.match(/(?:Student\s*Name|Name)[:\s.-]*([A-Z\s.]{3,30})/i);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
    }
  }

  // 4. Course / Department Pattern
  // e.g. "Bachelor of Computer Application" or "BCA"
  if (/Bachelor\s*of\s*Computer\s*Applications?/i.test(cleanText) || /\bBCA\b/i.test(cleanText)) {
    result.department = 'Bachelor of Computer Application (BCA)';
  } else if (/Bachelor\s*of\s*Business\s*Administration/i.test(cleanText) || /\bBBA\b/i.test(cleanText)) {
    result.department = 'Bachelor of Business Administration (BBA)';
  } else if (/Nursing/i.test(cleanText)) {
    result.department = 'Harsha College of Nursing';
  } else if (/Pharmacy/i.test(cleanText)) {
    result.department = 'Harsha College of Pharmacy';
  } else if (/Physiotherapy/i.test(cleanText)) {
    result.department = 'Harsha Institute of Physiotherapy';
  } else if (/Allied\s*Health/i.test(cleanText)) {
    result.department = 'Harsha Institute of Allied Health Sciences';
  } else if (/Law/i.test(cleanText)) {
    result.department = 'Harsha School of Law';
  }

  // 5. Batch Pattern
  // e.g. "Batch : 2023 - 2024" or "2023-2024"
  const batchMatch = cleanText.match(/Batch\s*[:\-]?\s*(\d{4}\s*[-–]\s*\d{4})/i);
  if (batchMatch) {
    result.batch = batchMatch[1].replace(/\s+/g, ' ');
  }

  // 6. Blood Group Pattern
  // e.g. "Blood Group : B+VE"
  const bloodMatch = cleanText.match(/Blood\s*Group\s*[:\-]?\s*([A-Z]{1,2}[+-](?:VE)?)/i);
  if (bloodMatch) {
    result.bloodGroup = bloodMatch[1].toUpperCase();
  }

  // 7. Validity Pattern
  // e.g. "Valid Upto : 2026"
  const validMatch = cleanText.match(/Valid\s*Upto\s*[:\-]?\s*(\d{4})/i);
  if (validMatch) {
    result.validUpto = validMatch[1];
  }

  // 8. Phone Numbers (Card Front & Back)
  const phoneMatches = cleanText.match(/\b[6-9]\d{9}\b/g);
  if (phoneMatches && phoneMatches.length > 0) {
    result.phone = phoneMatches[0];
    if (phoneMatches.length > 1) {
      result.emergencyContact = phoneMatches[1];
    }
  }

  // 9. Back side patterns: Father & Mother Name
  // e.g. "(F) REJI" and "(M) SHIBI"
  const fatherMatch = cleanText.match(/\(F\)\s*([A-Za-z\s]+?)(?=\s*(?:\(M\)|Guardian|Emergency|\r?\n|$))/i);
  if (fatherMatch) {
    result.fatherName = fatherMatch[1].trim();
  }

  const motherMatch = cleanText.match(/\(M\)\s*([A-Za-z\s]+?)(?=\s*(?:Guardian|Emergency|\r?\n|$))/i);
  if (motherMatch) {
    result.motherName = motherMatch[1].trim();
  }

  // 10. Emergency Contact from back
  // e.g. "Emergency no.: 9448040825"
  const emergencyMatch = cleanText.match(/Emergency\s*(?:no\.?)?[:\s.-]*([0-9]{10})/i);
  if (emergencyMatch) {
    result.emergencyContact = emergencyMatch[1];
  }

  return result;
}
