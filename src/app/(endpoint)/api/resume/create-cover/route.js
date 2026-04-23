export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { formatPhoneNumber } from '@/helpers/common';
import { sanitizeText, formatASCIIPart, shortenRole, sendError, shortenLinkedIn } from '@/helpers/endpoint';
import OpenAI from 'openai';
import profileModel from '@/models/profile.model';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import dbConnect from '@/mongodb';
import fontkit from '@pdf-lib/fontkit';
import { buildStrategicJobDescription } from '@/services/(endpoint)/resumes/resume-generation-prompts';

const MAX_COVER_JOB_DESCRIPTION_LENGTH = 10000;

export const POST = async (req) => {
  try {
    await dbConnect();

    const { profileId, desc, companyName, position } = await req.json();
    const profile = await profileModel.findById(profileId);
    const completion = await generateCover(desc, companyName, position, profile.profileName);

    const addr = profile.profileAddress;
    const address =
      addr.street || addr.city || addr.state || addr.zip ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') : '';

    const data = {
      name: sanitizeText(profile.profileName),
      mobile: sanitizeText(formatPhoneNumber(profile.profileMobile)),
      email: sanitizeText(profile.profileEmail),
      linkedin: sanitizeText(profile.profileLinkedIn),
      address: sanitizeText(address),
      education: profile.profileEducation,
      companyName,
      position
    };
    const r = { ...data, ...completion };
    const profileTemplate = profile?.profileTemplate || 'template1';
    const cover_name = `${formatASCIIPart(r.name)}_${shortenRole(companyName)}`;

    let pdfBytes = null;
    if (profileTemplate === 'template1') {
      pdfBytes = await generateCoverPDF(r);
    } else if (profileTemplate === 'template2') {
      pdfBytes = await generateCoverPDF2(r);
    } else {
      pdfBytes = await generateCoverPDF(r);
    }

    return new Response(new Uint8Array(Buffer.from(pdfBytes)), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${cover_name}.pdf"`
      }
    });
  } catch (error) {
    console.log(error);
    return sendError(Response, { msg: 'Unknown error' });
  }
};

const prepareCoverPrompt = (jobDescription, companyName, position, yourName) => {
  const strategicJobDescription = buildStrategicJobDescription(jobDescription, MAX_COVER_JOB_DESCRIPTION_LENGTH);
  const protectedNames = extractProtectedCoverNames(jobDescription, companyName);

  return `
You are an expert cover letter writer.

Your ONLY task is to generate a polished, human, natural, and professional cover letter that follows the exact structure below.

The cover letter MUST follow this format:

------------------------------------------------------------
${yourName}

${companyName}  
${position}

Dear Hiring Team,

[OPENING PARAGRAPH — 3–4 sentences]  
Introduce yourself and express genuine excitement about the company and the role. Briefly reference themes from the job description such as mission, product impact, domain, or technology focus. Keep the tone warm, engaging, and concise. Do NOT reference past work experience.

[BODY PARAGRAPH — 4–6 sentences]  
Explain why this role aligns with your strengths, interests, and the kind of engineering work you enjoy. Reference responsibilities, technologies, or problem areas from the job description, but without implying any past employers, job titles, or company-specific prior experience. Focus on motivation, curiosity, collaboration, technical enthusiasm, and alignment with the company's direction.

[CLOSING PARAGRAPH — 2–3 sentences]  
Thank the team, express interest in the next steps, and reinforce enthusiasm for contributing to the company.

Sincerely,  
${yourName}
------------------------------------------------------------

RULES:
- DO NOT include any skills list.  
- DO NOT mention or imply past employers, job titles, or work history.  
- DO NOT restate resume content.  
- DO NOT fabricate experience.  
- DO NOT claim or imply that the candidate has worked at ${companyName || 'the target company'} or on its named products, platforms, solutions, teams, customers, or internal initiatives.
- Treat target-side branded names from the job description as application context only, not as evidence of prior experience.
- If the job description includes branded internal product or platform names, you may reference them only as the role's context or rewrite them more generically.
- Must sound human, conversational, warm, and technically aware.  
- Keep total length approximately 150–220 words.  
- The letter should fit software-related engineering roles broadly, including software, data, AI/ML, DevOps, IoT, and embedded roles, by emphasizing the type of engineering problems, systems, and technologies named in the job description.

FINAL CHECK BEFORE YOU ANSWER:
- The letter must not contain any sentence that sounds like the candidate already worked with the target company.
- The letter must not describe target-company internal platforms or initiatives as prior experience.
- The letter must speak in terms of interest, alignment, motivation, and readiness to contribute.

Write the full cover letter now.

Protected target-side names:
${JSON.stringify(protectedNames, null, 2)}

JOB DESCRIPTION TO ALIGN WITH:
${strategicJobDescription}
`;
};

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function truncateText(value, maxLength) {
  const text = cleanString(value);
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

function normalizeJobDescriptionText(value) {
  return cleanString(value)
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

function uniqueTerms(values, maxItems = Number.POSITIVE_INFINITY) {
  const results = [];
  const seen = new Set();

  for (const value of values) {
    const normalized = cleanString(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(normalized);

    if (results.length >= maxItems) {
      break;
    }
  }

  return results;
}

function extractProtectedCoverNames(jobDescription, companyName = '') {
  const text = normalizeJobDescriptionText(jobDescription);
  if (!text) {
    return companyName ? [companyName] : [];
  }

  const protectedNames = [];
  const brandedPattern =
    /\b([A-Z][A-Za-z0-9&.-]*(?:\s+[A-Z][A-Za-z0-9&.-]*)*(?:\s+(?:and|of|for|&)\s+[A-Z][A-Za-z0-9&.-]*)*\s+(?:solution|platform|product|team|initiative|framework|system))\b/g;

  for (const match of text.matchAll(brandedPattern)) {
    protectedNames.push(match[1]);
  }

  if (companyName) {
    protectedNames.push(companyName);
  }

  return uniqueTerms(protectedNames, 20);
}

const getAICompletion = async (prompt) => {
  const model = 'gpt-4.1-nano';
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  });

  const content = completion.choices[0].message.content.trim();

  try {
    // Attempt JSON parsing
    return JSON.parse(content);
  } catch {
    // Fallback: plain text (cover letter)
    return { cover_letter: content };
  }
};

const generateCover = async (jobDescription, companyName, position, yourName) => {
  const prompt = prepareCoverPrompt(jobDescription, companyName, position, yourName);
  const completion = await getAICompletion(prompt);
  return completion;
};

const generateCoverPDF = async (data) => {
  const STYLE = {
    marginX: 72,
    marginY: 72,
    lineHeight: 16,
    paragraphSpacing: 20,
    headerSpacing: 30,

    nameFontSize: 22,
    roleFontSize: 14,
    bodyFontSize: 12,
    subFontSize: 11,

    colors: {
      dark: rgb(0.1, 0.1, 0.1),
      faded: rgb(0.45, 0.45, 0.45)
    }
  };

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - STYLE.marginY;

  const wrap = (text, font, size, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > maxWidth) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };

  const draw = (text, opts = {}) => {
    const {
      font = fontRegular,
      size = STYLE.bodyFontSize,
      color = STYLE.colors.dark,
      spacing = STYLE.paragraphSpacing,
      alignRight = false
    } = opts;

    const clean = sanitizeText(text);
    const maxWidth = width - STYLE.marginX * 2;
    const lines = wrap(clean, font, size, maxWidth);

    lines.forEach((line) => {
      const x = alignRight ? width - STYLE.marginX - font.widthOfTextAtSize(line, size) : STYLE.marginX;

      page.drawText(line, { x, y, size, font, color });
      y -= STYLE.lineHeight;
    });

    y -= spacing;
  };

  // ========== HEADER ==========
  page.drawText(data.name, {
    x: STYLE.marginX,
    y,
    size: STYLE.nameFontSize,
    font: fontBold
  });
  y -= STYLE.headerSpacing;

  const contactLine = `${data.email} | ${data.mobile} | ${data.address}`;
  draw(contactLine, {
    spacing: STYLE.paragraphSpacing - 10,
    color: STYLE.colors.faded
  });

  if (data.linkedin) {
    const maxWidth = width - STYLE.marginX * 2;
    const linkedinLines = wrap(sanitizeText(data.linkedin), fontRegular, STYLE.subFontSize, maxWidth);

    linkedinLines.forEach((line) => {
      page.drawText(line, {
        x: STYLE.marginX,
        y,
        size: STYLE.subFontSize,
        font: fontRegular,
        color: STYLE.colors.faded
      });
      y -= STYLE.lineHeight;
    });

    y -= STYLE.paragraphSpacing - 10;
  }

  // ========== DATE (RIGHT ALIGNED) ==========
  const today = new Date();
  const currentDate = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  draw(currentDate, {
    alignRight: true,
    spacing: STYLE.headerSpacing
  });

  // ========== COMPANY BLOCK ==========
  draw(data.companyName, { spacing: 2 });
  draw(data.position, { spacing: STYLE.headerSpacing });

  // ========== BODY PARAGRAPHS ==========
  const bodyParagraphs = data.cover_letter
    .split('\n\n')
    .slice(2) // skip name + date sections
    .map((p) => sanitizeText(p))
    .filter((p) => !p.startsWith('Sincerely') && !p.endsWith(data.name));

  bodyParagraphs.forEach((p) => draw(p));

  // ========== SIGNATURE ==========
  draw('Sincerely,', { spacing: 10 });
  draw(data.name, { spacing: 0 });

  return await pdfDoc.save();
};

const generateCoverPDF2 = async (data) => {
  const STYLE = {
    marginX: 72,
    marginY: 72,
    lineHeight: 16,
    paragraphSpacing: 20,
    headerSpacing: 30,
    headerHeight: 120,

    nameFontSize: 22,
    contactFontSize: 11,
    roleFontSize: 14,
    bodyFontSize: 12,

    colors: {
      dark: rgb(0.1, 0.1, 0.1),
      faded: rgb(0.45, 0.45, 0.45),
      bg: rgb(0.17, 0.18, 0.25),
      white: rgb(1, 1, 1)
    }
  };

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage();
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - STYLE.marginY;

  const wrap = (text, font, size, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > maxWidth) {
        lines.push(line);
        line = w;
      } else line = t;
    }
    if (line) lines.push(line);
    return lines;
  };

  const draw = (text, opts = {}) => {
    const {
      font = fontRegular,
      size = STYLE.bodyFontSize,
      color = STYLE.colors.dark,
      spacing = STYLE.paragraphSpacing,
      alignRight = false
    } = opts;

    const clean = sanitizeText(text);
    const maxWidth = width - STYLE.marginX * 2;
    const lines = wrap(clean, font, size, maxWidth);

    lines.forEach((line) => {
      const x = alignRight ? width - STYLE.marginX - font.widthOfTextAtSize(line, size) : STYLE.marginX;

      page.drawText(line, { x, y, size, font, color });
      y -= STYLE.lineHeight;
    });

    y -= spacing;
  };

  // ========== HEADER ==========
  page.drawRectangle({
    x: 0,
    y: height - STYLE.headerHeight,
    width,
    height: STYLE.headerHeight,
    color: STYLE.colors.bg
  });

  page.drawText(data.name, {
    x: STYLE.marginX,
    y: height - 55,
    size: STYLE.nameFontSize,
    font: fontBold,
    color: STYLE.colors.white
  });

  // HEADER BOUNDARIES
  const headerBottom = height - STYLE.headerHeight;

  // Start contact block aligned visually with the name block
  let cy = height - 40; // adjust vertically so first line aligns with name

  const contactColumnWidth = 220;
  const maxContactWidth = contactColumnWidth;

  const shortLinked = shortenLinkedIn(data.linkedin);

  // Build contact fields
  const contactFields = [data.email, data.mobile, data.address, shortLinked].filter(Boolean);

  const wrapHeaderText = (text) => wrap(text, fontRegular, STYLE.contactFontSize, maxContactWidth);

  contactFields.forEach((field) => {
    const clean = sanitizeText(field);
    const wrappedLines = wrapHeaderText(clean);

    wrappedLines.forEach((line) => {
      if (!line.trim()) return;
      const lineWidth = fontRegular.widthOfTextAtSize(line, STYLE.contactFontSize);

      const x = width - STYLE.marginX - lineWidth;

      page.drawText(line, {
        x,
        y: cy,
        size: STYLE.contactFontSize,
        font: fontRegular,
        color: STYLE.colors.white
      });

      cy -= STYLE.lineHeight;
    });
    cy -= 4;
  });

  // Reset body start position safely below header
  y = headerBottom - 40;

  // ========== DATE (RIGHT ALIGNED) ==========
  const today = new Date();
  const currentDate = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  draw(currentDate, {
    alignRight: true,
    spacing: STYLE.headerSpacing
  });

  // ========== COMPANY BLOCK ==========
  draw(data.companyName, { spacing: 2 });
  draw(data.position, { spacing: STYLE.headerSpacing });

  // ========== BODY PARAGRAPHS ==========
  const bodyParagraphs = data.cover_letter
    .split('\n\n')
    .slice(2) // skip name + date sections
    .map((p) => sanitizeText(p))
    .filter((p) => !p.startsWith('Sincerely') && !p.endsWith(data.name));

  bodyParagraphs.forEach((p) => draw(p));

  // ========== SIGNATURE ==========
  draw('Sincerely,', { spacing: 10 });
  draw(data.name, { spacing: 0 });

  return await pdfDoc.save();
};
