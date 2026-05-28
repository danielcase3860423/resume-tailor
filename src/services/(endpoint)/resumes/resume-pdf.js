import { sanitizeText } from '@/helpers/endpoint';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { readFile } from 'fs/promises';
import path from 'path';

function getEducationEntry(data) {
  return data?.education?.[0] || {
    educationLevel: '',
    institution: '',
    startDate: '',
    yearOfCompletion: ''
  };
}

function getSafeSummary(data) {
  return Array.isArray(data?.summary) ? data.summary : [];
}

function getSafeWorkExperiences(data) {
  return Array.isArray(data?.work_experiences) ? data.work_experiences : [];
}

function getSafeTechnicalSkills(data) {
  return data?.technical_skills && typeof data.technical_skills === 'object' ? data.technical_skills : {};
}

function wrapTextWithLongWordBreak(text, font, size, availableWidth) {
  const safeText = sanitizeText(text || '');
  const words = safeText.split(' ');
  const lines = [];
  let line = '';

  const splitLongWord = (word) => {
    const parts = [];
    let chunk = '';

    for (const char of word) {
      const testChunk = chunk + char;
      if (chunk && font.widthOfTextAtSize(testChunk, size) > availableWidth) {
        parts.push(chunk);
        chunk = char;
      } else {
        chunk = testChunk;
      }
    }

    if (chunk) {
      parts.push(chunk);
    }

    return parts;
  };

  for (const word of words) {
    if (!word) {
      continue;
    }

    if (font.widthOfTextAtSize(word, size) > availableWidth) {
      if (line) {
        lines.push(line);
        line = '';
      }

      const pieces = splitLongWord(word);
      const lastPiece = pieces.pop();
      lines.push(...pieces);
      line = lastPiece || '';
      continue;
    }

    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > availableWidth) {
      if (line) {
        lines.push(line);
      }
      line = word;
    } else {
      line = test;
    }
  }

  if (line) {
    lines.push(line);
  }

  return lines;
}

async function loadBitterFonts(pdfDoc) {
  pdfDoc.registerFontkit(fontkit);
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Bitter-Regular.ttf');
  const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'Bitter-Bold.ttf');
  const fontBytes = await readFile(fontPath);
  const fontBoldBytes = await readFile(fontBoldPath);

  return {
    fontRegular: await pdfDoc.embedFont(fontBytes),
    fontBold: await pdfDoc.embedFont(fontBoldBytes)
  };
}

async function loadHelveticaFonts(pdfDoc) {
  return {
    fontRegular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    fontBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    fontItalic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  };
}

async function loadTimesFonts(pdfDoc) {
  return {
    fontRegular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    fontBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
    fontItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
  };
}

async function loadCourierFonts(pdfDoc) {
  return {
    fontRegular: await pdfDoc.embedFont(StandardFonts.Courier),
    fontBold: await pdfDoc.embedFont(StandardFonts.CourierBold),
    fontItalic: await pdfDoc.embedFont(StandardFonts.CourierOblique)
  };
}

async function generateTemplate1(data) {
  const PDF_STYLE = {
    marginX: 24,
    marginY: 48,
    fontSize: 12,
    nameFontSize: 20,
    positionFontSize: 16,
    sectionFontSize: 13,
    lineHeight: 16,
    sectionSpacing: 12,
    hypenIndent: 8,
    bulletIndent: 8,
    minY: 70,
    headerSpacing: 20,
    table: {
      categoryColWidth: 140,
      padding: 4
    },
    colors: {
      accent: rgb(0, 0.35, 0.7),
      dark: rgb(0.12, 0.12, 0.12),
      tableHeaderBg: rgb(0.92, 0.92, 0.92),
      faded: rgb(0.4, 0.4, 0.4)
    }
  };

  const education = getEducationEntry(data);
  const summary = getSafeSummary(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`${data.name} - Resume`);
  pdfDoc.setProducer('');
  pdfDoc.setCreator('');
  pdfDoc.setAuthor(`${data.name}`);
  pdfDoc.setKeywords(['Resume', data.name, data.target_position || '']);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const { fontRegular, fontBold, fontItalic } = await loadHelveticaFonts(pdfDoc);

  let y = height - PDF_STYLE.marginY;
  const maxWidth = width - PDF_STYLE.marginX * 2;

  const addNewPage = () => {
    page = pdfDoc.addPage();
    y = height - PDF_STYLE.marginY;
  };

  const wrapText = (text, font, size, maxW) => {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(testLine, size) > maxW) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) lines.push(line);
    return lines;
  };

  const drawTextBlock = (text, size = PDF_STYLE.fontSize, font = fontRegular, color = PDF_STYLE.colors.dark) => {
    const lines = wrapText(text, font, size, maxWidth);
    y -= PDF_STYLE.lineHeight / 2;

    for (const line of lines) {
      if (y < PDF_STYLE.minY) addNewPage();
      page.drawText(sanitizeText(line), { x: PDF_STYLE.marginX, y, size, font, color });
      y -= PDF_STYLE.lineHeight;
    }
  };

  const drawSectionTitle = (title) => {
    if (y < PDF_STYLE.minY + 15) addNewPage();

    page.drawText(sanitizeText(title.toUpperCase()), {
      x: PDF_STYLE.marginX,
      y,
      size: PDF_STYLE.sectionFontSize,
      font: fontBold,
      color: PDF_STYLE.colors.accent
    });

    y -= PDF_STYLE.lineHeight - 12;

    page.drawLine({
      start: { x: PDF_STYLE.marginX, y },
      end: { x: width - PDF_STYLE.marginX, y },
      thickness: 1,
      color: PDF_STYLE.colors.faded
    });

    y -= PDF_STYLE.sectionSpacing;
  };

  const drawBullets = (achievements) => {
    for (const achievementItem of achievements || []) {
      const achievement = `• ${achievementItem}`;
      const lines = wrapText(achievement, fontRegular, PDF_STYLE.fontSize, maxWidth - PDF_STYLE.bulletIndent - PDF_STYLE.hypenIndent);

      for (const line of lines) {
        if (y < PDF_STYLE.minY) addNewPage();
        page.drawText(sanitizeText(line), {
          x: PDF_STYLE.marginX + PDF_STYLE.bulletIndent + PDF_STYLE.hypenIndent,
          y,
          size: PDF_STYLE.fontSize,
          font: fontRegular
        });
        y -= PDF_STYLE.lineHeight;
      }
    }
    y -= 8;
  };

  const drawExperience = (exp) => {
    if (y < PDF_STYLE.minY + 20) addNewPage();

    const titleLine = sanitizeText(`- ${exp.job_title} | ${exp.company_name}`);
    const titleIndent = PDF_STYLE.lineHeight / 2;

    page.drawText(titleLine, {
      x: PDF_STYLE.marginX + PDF_STYLE.hypenIndent,
      y: y - titleIndent,
      size: PDF_STYLE.fontSize + 1,
      font: fontBold
    });

    const periodText = sanitizeText(`(${exp.start_date_employment} ~ ${exp.end_date_employment})`);
    const periodWidth = fontRegular.widthOfTextAtSize(periodText, PDF_STYLE.fontSize);
    page.drawText(periodText, {
      x: width - PDF_STYLE.marginX - periodWidth,
      y: y - titleIndent,
      size: PDF_STYLE.fontSize,
      font: fontRegular,
      color: PDF_STYLE.colors.faded
    });

    y -= PDF_STYLE.lineHeight + titleIndent;
    drawBullets(exp.achievements);
  };

  const drawRowBorders = (startX, rowY, rowHeight, colWidths) => {
    const totalWidth = colWidths.reduce((a, b) => a + b, 0);

    page.drawLine({ start: { x: startX, y: rowY }, end: { x: startX + totalWidth, y: rowY } });
    page.drawLine({ start: { x: startX, y: rowY - rowHeight }, end: { x: startX + totalWidth, y: rowY - rowHeight } });

    let x = startX;
    for (const w of colWidths) {
      page.drawLine({ start: { x, y: rowY }, end: { x, y: rowY - rowHeight } });
      x += w;
    }

    page.drawLine({ start: { x, y: rowY }, end: { x, y: rowY - rowHeight } });
  };

  const drawTableRow = (startX, rowY, rowHeight, colWidths, rowLines, isHeader = false) => {
    if (isHeader) {
      page.drawRectangle({
        x: startX,
        y: rowY - rowHeight,
        width: colWidths.reduce((a, b) => a + b, 0),
        height: rowHeight,
        color: PDF_STYLE.colors.tableHeaderBg
      });
    }

    let x = startX;
    rowLines.forEach((cellLines, i) => {
      let textY = rowY - PDF_STYLE.fontSize - 4;
      const cellX = x + PDF_STYLE.table.padding;

      for (const line of cellLines) {
        page.drawText(sanitizeText(line), {
          x: cellX,
          y: textY,
          size: PDF_STYLE.fontSize,
          font: fontRegular
        });
        textY -= PDF_STYLE.fontSize + 3;
      }

      x += colWidths[i];
    });

    drawRowBorders(startX, rowY, rowHeight, colWidths);
  };

  const drawWrappedTable = ({ startX, startY, columnWidths, headers, rows }) => {
    let yPos = startY;
    const wrapCell = (text, colWidth) => wrapText(text, fontRegular, PDF_STYLE.fontSize, colWidth - PDF_STYLE.table.padding * 2);
    const headerLines = headers.map((header, i) => wrapCell(header, columnWidths[i]));
    const headerHeight = Math.max(...headerLines.map((lines) => lines.length)) * (PDF_STYLE.fontSize + 3) + PDF_STYLE.table.padding * 2;

    drawTableRow(startX, yPos, headerHeight, columnWidths, headerLines, true);
    yPos -= headerHeight;

    rows.forEach((row) => {
      const rowLines = row.map((cell, i) => wrapCell(String(cell), columnWidths[i]));
      const rowHeight = Math.max(...rowLines.map((lines) => lines.length)) * (PDF_STYLE.fontSize + 3) + PDF_STYLE.table.padding * 2;

      drawTableRow(startX, yPos, rowHeight, columnWidths, rowLines);
      yPos -= rowHeight;
    });

    return yPos;
  };

  const centerText = (text, font, size, yPos, color) => {
    const safeText = sanitizeText(text || '');
    const textWidth = font.widthOfTextAtSize(safeText, size);
    page.drawText(safeText, { x: (width - textWidth) / 2, y: yPos, size, font, color });
  };

  centerText(data.name, fontBold, PDF_STYLE.nameFontSize, y, PDF_STYLE.colors.dark);
  y -= PDF_STYLE.headerSpacing;
  // centerText(data.target_position, fontItalic, PDF_STYLE.positionFontSize, y, PDF_STYLE.colors.dark);
  // y -= PDF_STYLE.headerSpacing;
  centerText(`${data.mobile}   |   ${data.email}   |   ${data.address}`, fontRegular, PDF_STYLE.fontSize, y, PDF_STYLE.colors.dark);
  y -= PDF_STYLE.headerSpacing;
  centerText(data.linkedin || '', fontRegular, PDF_STYLE.fontSize, y, PDF_STYLE.colors.faded);
  y -= PDF_STYLE.sectionSpacing;

  drawSectionTitle('Summary');
  y -= PDF_STYLE.sectionSpacing;
  drawBullets(summary);
  y -= PDF_STYLE.sectionSpacing;

  drawSectionTitle('Technical Skills');
  const categoryWidth = PDF_STYLE.table.categoryColWidth;
  const skillsWidth = width - PDF_STYLE.marginX * 2 - categoryWidth;
  const skillRows = Object.entries(technicalSkills).map(([cat, skills]) => [cat, skills.join(', ')]);
  y =
    drawWrappedTable({
      startX: PDF_STYLE.marginX,
      startY: y,
      columnWidths: [categoryWidth, skillsWidth],
      headers: ['Category', 'Skills'],
      rows: skillRows
    }) - PDF_STYLE.sectionSpacing;
  y -= PDF_STYLE.sectionSpacing;

  drawSectionTitle('Experience');
  workExperiences.forEach(drawExperience);

  y -= PDF_STYLE.sectionSpacing;
  drawSectionTitle('Education');
  drawTextBlock(
    `${education.educationLevel} - ${education.institution} (${education.startDate} ~ ${education.yearOfCompletion})`
  );

  return pdfDoc.save();
}

async function generateTemplate2(data) {
  const pdfStyle = {
    fontsize: {
      name: 20,
      title: 16,
      contactInfo: 12,
      sectionTitle: 13,
      positionTitle: 12,
      companyName: 11,
      period: 10,
      achievements: 10,
      summary: 10,
      skills: 10
    },
    margin: {
      x: 32,
      y: 32
    },
    spacing: {
      section: 14,
      normal: 12
    },
    minY: 48,
    colors: {
      accentGreen: rgb(0.18, 0.55, 0.27),
      accentGreen1: rgb(0.15, 0.52, 0.25),
      dark: rgb(0.12, 0.12, 0.12),
      faded: rgb(0.48, 0.48, 0.48),
      black: rgb(0, 0, 0)
    }
  };

  const education = getEducationEntry(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  const { fontRegular, fontBold } = await loadBitterFonts(pdfDoc);
  const { fontItalic } = await loadHelveticaFonts(pdfDoc);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - pdfStyle.margin.y;

  const addNewPage = () => {
    page = pdfDoc.addPage();
    y = height - pdfStyle.margin.y;
  };

  const wrap = (text, font, size, maxWidth) => {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }

    if (line) lines.push(line);
    return lines;
  };

  const drawText = (text, size, font, color = pdfStyle.colors.dark) => {
    const lines = wrap(sanitizeText(text || ''), font, size, width - pdfStyle.margin.x * 2);
    for (const line of lines) {
      if (y < pdfStyle.minY) addNewPage();
      page.drawText(line, { x: pdfStyle.margin.x, y, size, font, color });
      y -= size * 1.2;
    }
  };

  const drawSummaryBullets = (items) => {
    (items || []).forEach((item) => {
      const lines = wrap(`• ${sanitizeText(item || '')}`, fontRegular, pdfStyle.fontsize.summary, width - pdfStyle.margin.x * 2 - 10);
      lines.forEach((line) => {
        if (y < pdfStyle.minY) addNewPage();
        page.drawText(line, { x: pdfStyle.margin.x + 8, y, size: pdfStyle.fontsize.summary, font: fontRegular, color: pdfStyle.colors.dark });
        y -= pdfStyle.fontsize.summary * 1.2;
      });
    });
  };

  const drawSectionTitle = (title) => {
    if (y < pdfStyle.minY) addNewPage();
    page.drawText(sanitizeText(title.toUpperCase()), {
      x: pdfStyle.margin.x,
      y,
      size: pdfStyle.fontsize.sectionTitle,
      font: fontBold,
      color: pdfStyle.colors.accentGreen
    });
    y -= pdfStyle.spacing.section;
  };

  const drawDivider = () => {
    page.drawLine({
      start: { x: pdfStyle.margin.x, y: y + pdfStyle.spacing.section - 4 },
      end: { x: width - pdfStyle.margin.x, y: y + pdfStyle.spacing.section - 4 },
      thickness: 2,
      color: pdfStyle.colors.black
    });
  };

  drawText(sanitizeText((data.name || '').toUpperCase()), pdfStyle.fontsize.name, fontBold, pdfStyle.colors.black);
  drawText(sanitizeText(data.target_position || ''), pdfStyle.fontsize.title, fontItalic, pdfStyle.colors.accentGreen);
  drawText(
    [data.mobile, data.email, data.linkedin || null, data.address].filter(Boolean).join('   |   '),
    pdfStyle.fontsize.contactInfo,
    fontRegular,
    pdfStyle.colors.dark
  );

  y -= pdfStyle.spacing.normal;
  drawSectionTitle('Experiences');
  drawDivider();

  const drawExperience = (exp) => {
    y -= pdfStyle.spacing.normal;
    const expMarginX = pdfStyle.margin.x * 1.2;

    if (y < pdfStyle.minY) addNewPage();

    drawText(sanitizeText(exp.job_title || ''), pdfStyle.fontsize.positionTitle, fontBold, pdfStyle.colors.black);
    drawText(sanitizeText(exp.company_name || ''), pdfStyle.fontsize.companyName, fontBold, pdfStyle.colors.accentGreen1);
    drawText(
      sanitizeText(`${exp.start_date_employment || ''} - ${exp.end_date_employment || ''}`),
      pdfStyle.fontsize.period,
      fontRegular,
      pdfStyle.colors.faded
    );

    (exp.achievements || []).forEach((bullet) => {
      const lines = wrap(`• ${bullet}`, fontRegular, pdfStyle.fontsize.achievements, width - expMarginX * 2);
      lines.forEach((line) => {
        if (y < pdfStyle.minY) addNewPage();
        page.drawText(sanitizeText(line), { x: expMarginX, y, size: pdfStyle.fontsize.achievements, font: fontRegular });
        y -= pdfStyle.fontsize.achievements * 1.2;
      });
    });
  };

  workExperiences.forEach(drawExperience);
  y -= pdfStyle.spacing.section;

  if (y < pdfStyle.minY) addNewPage();
  drawSectionTitle('Education');
  drawDivider();
  y -= pdfStyle.spacing.normal;
  drawText(sanitizeText(education.educationLevel || ''), pdfStyle.fontsize.positionTitle, fontBold);
  drawText(sanitizeText(education.institution || ''), pdfStyle.fontsize.companyName, fontRegular, pdfStyle.colors.accentGreen);
  drawText(
    sanitizeText(`${education.startDate || ''} - ${education.yearOfCompletion || ''}`),
    pdfStyle.fontsize.period,
    fontRegular,
    pdfStyle.colors.faded
  );

  y -= pdfStyle.spacing.section;
  if (y < pdfStyle.minY) addNewPage();
  drawSectionTitle('Summary');
  drawDivider();
  y -= pdfStyle.spacing.normal;
  drawSummaryBullets(getSafeSummary(data));

  y -= pdfStyle.spacing.section;
  if (y < pdfStyle.minY) addNewPage();
  drawSectionTitle('Skills');
  drawDivider();
  y -= pdfStyle.spacing.normal;

  let buffer = '';
  Object.values(technicalSkills).forEach((skillList) => {
    skillList.forEach((skill) => {
      const skillText = sanitizeText(String(skill));
      const test = sanitizeText(`${buffer}${skillText} `);
      if (fontRegular.widthOfTextAtSize(test, pdfStyle.fontsize.skills) > width - pdfStyle.margin.x * 2) {
        drawText(buffer, pdfStyle.fontsize.skills, fontRegular);
        buffer = '';
      }

      buffer += `${skillText}, `;
    });
  });

  buffer = buffer.replace(/, $/, '');
  if (buffer.length > 0) drawText(buffer, pdfStyle.fontsize.skills, fontRegular);

  return pdfDoc.save();
}

async function generateTemplate3(data) {
  const style = {
    marginX: 34,
    marginY: 34,
    leftColWidth: 170,
    lineHeight: 14,
    minY: 42,
    colors: {
      slate: rgb(0.15, 0.21, 0.29),
      lightSlate: rgb(0.93, 0.95, 0.97),
      accent: rgb(0.71, 0.34, 0.18),
      dark: rgb(0.12, 0.12, 0.12),
      faded: rgb(0.44, 0.44, 0.44)
    }
  };

  const education = getEducationEntry(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);
  const summary = getSafeSummary(data);

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const { fontRegular, fontBold, fontItalic } = await loadHelveticaFonts(pdfDoc);

  let rightY = height - style.marginY;
  const leftX = style.marginX;
  const leftWidth = style.leftColWidth;
  const rightX = leftX + leftWidth + 24;
  const rightWidth = width - rightX - style.marginX;

  page.drawRectangle({
    x: 0,
    y: 0,
    width: leftX + leftWidth + 10,
    height,
    color: style.colors.lightSlate
  });

  const wrap = (text, font, size, maxWidth) => {
    const words = sanitizeText(text || '').split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }

    if (line) lines.push(line);
    return lines;
  };

  const drawLines = (lines, opts) => {
    const {
      x,
      yRef,
      size,
      font,
      color,
      maxWidth,
      spacing = style.lineHeight
    } = opts;

    let currentY = yRef;
    const normalizedLines = Array.isArray(lines) ? lines : wrap(lines, font, size, maxWidth);

    for (const line of normalizedLines) {
      if (currentY < style.minY) {
        page = pdfDoc.addPage();
        currentY = height - style.marginY;
      }

      page.drawText(sanitizeText(line), { x, y: currentY, size, font, color });
      currentY -= spacing;
    }

    return currentY;
  };

  let leftY = height - style.marginY;
  leftY = drawLines(data.name || '', {
    x: leftX,
    yRef: leftY,
    size: 19,
    font: fontBold,
    color: style.colors.slate,
    maxWidth: leftWidth,
    spacing: 18
  });
  leftY -= 10;
  leftY = drawLines(data.target_position || '', {
    x: leftX,
    yRef: leftY,
    size: 11,
    font: fontItalic,
    color: style.colors.accent,
    maxWidth: leftWidth
  });
  leftY -= 14;
  leftY = drawLines('CONTACT', {
    x: leftX,
    yRef: leftY,
    size: 11,
    font: fontBold,
    color: style.colors.slate,
    maxWidth: leftWidth
  });
  leftY -= 6;
  leftY = drawLines([data.mobile, data.email, data.linkedin, data.address].filter(Boolean), {
    x: leftX,
    yRef: leftY,
    size: 9,
    font: fontRegular,
    color: style.colors.dark,
    maxWidth: leftWidth,
    spacing: 12
  });
  leftY -= 12;
  leftY = drawLines('SKILLS', {
    x: leftX,
    yRef: leftY,
    size: 11,
    font: fontBold,
    color: style.colors.slate,
    maxWidth: leftWidth
  });
  leftY -= 6;

  Object.entries(technicalSkills).forEach(([category, skills]) => {
    leftY = drawLines(category, {
      x: leftX,
      yRef: leftY,
      size: 9,
      font: fontBold,
      color: style.colors.accent,
      maxWidth: leftWidth
    });
    leftY = drawLines((skills || []).join(', '), {
      x: leftX,
      yRef: leftY,
      size: 8.5,
      font: fontRegular,
      color: style.colors.dark,
      maxWidth: leftWidth,
      spacing: 11
    });
    leftY -= 8;
  });

  rightY = drawLines('SUMMARY', {
    x: rightX,
    yRef: rightY,
    size: 12,
    font: fontBold,
    color: style.colors.slate,
    maxWidth: rightWidth
  });
  rightY -= 8;
  summary.forEach((line) => {
    rightY = drawLines(`• ${line}`, {
      x: rightX,
      yRef: rightY,
      size: 10,
      font: fontRegular,
      color: style.colors.dark,
      maxWidth: rightWidth,
      spacing: 13
    });
  });
  rightY -= 14;

  rightY = drawLines('EXPERIENCE', {
    x: rightX,
    yRef: rightY,
    size: 12,
    font: fontBold,
    color: style.colors.slate,
    maxWidth: rightWidth
  });
  rightY -= 8;

  workExperiences.forEach((exp) => {
    rightY = drawLines(exp.job_title || '', {
      x: rightX,
      yRef: rightY,
      size: 11,
      font: fontBold,
      color: style.colors.dark,
      maxWidth: rightWidth
    });
    rightY = drawLines(
      `${exp.company_name || ''} | ${exp.start_date_employment || ''} - ${exp.end_date_employment || ''}`,
      {
        x: rightX,
        yRef: rightY,
        size: 9,
        font: fontRegular,
        color: style.colors.accent,
        maxWidth: rightWidth
      }
    );

    (exp.achievements || []).slice(0, 8).forEach((achievement) => {
      rightY = drawLines(`• ${achievement}`, {
        x: rightX + 4,
        yRef: rightY,
        size: 9,
        font: fontRegular,
        color: style.colors.dark,
        maxWidth: rightWidth - 4,
        spacing: 12
      });
    });
    rightY -= 10;
  });

  rightY = drawLines('EDUCATION', {
    x: rightX,
    yRef: rightY,
    size: 12,
    font: fontBold,
    color: style.colors.slate,
    maxWidth: rightWidth
  });
  rightY -= 8;
  drawLines(
    `${education.educationLevel || ''} | ${education.institution || ''} | ${education.startDate || ''} - ${education.yearOfCompletion || ''}`,
    {
      x: rightX,
      yRef: rightY,
      size: 9,
      font: fontRegular,
      color: style.colors.dark,
      maxWidth: rightWidth
    }
  );

  return pdfDoc.save();
}

async function generateTemplate4(data) {
  const style = {
    marginX: 42,
    marginY: 38,
    lineHeight: 14,
    minY: 50,
    colors: {
      accent: rgb(0.12, 0.3, 0.54),
      dark: rgb(0.14, 0.14, 0.14),
      faded: rgb(0.42, 0.42, 0.42)
    }
  };

  const education = getEducationEntry(data);
  const summary = getSafeSummary(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  const { fontRegular, fontBold, fontItalic } = await loadTimesFonts(pdfDoc);

  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - style.marginY;
  const maxWidth = width - style.marginX * 2;

  const addPage = () => {
    page = pdfDoc.addPage();
    y = height - style.marginY;
  };

  const wrap = (text, font, size, availableWidth) => {
    return wrapTextWithLongWordBreak(text, font, size, availableWidth);
  };

  const drawBlock = (text, opts = {}) => {
    const { size = 11, font = fontRegular, color = style.colors.dark, spacing = style.lineHeight, x = style.marginX } = opts;
    const lines = wrap(text, font, size, maxWidth);
    for (const line of lines) {
      if (y < style.minY) addPage();
      page.drawText(line, { x, y, size, font, color });
      y -= spacing;
    }
  };

  const drawSection = (title) => {
    if (y < style.minY + 20) addPage();
    page.drawText(sanitizeText(title.toUpperCase()), {
      x: style.marginX,
      y,
      size: 11,
      font: fontBold,
      color: style.colors.accent
    });
    y -= 8;
    page.drawLine({
      start: { x: style.marginX, y },
      end: { x: width - style.marginX, y },
      thickness: 0.8,
      color: style.colors.accent
    });
    y -= 14;
  };

  drawBlock(data.name || '', { size: 22, font: fontBold, spacing: 22 });
  drawBlock(data.target_position || '', { size: 13, font: fontItalic, color: style.colors.accent });
  drawBlock([data.email, data.mobile, data.linkedin, data.address].filter(Boolean).join(' | '), {
    size: 10,
    color: style.colors.faded
  });
  y -= 8;

  drawSection('Professional Summary');
  summary.forEach((item) => drawBlock(`• ${item}`, { size: 10.5 }));
  y -= 6;

  drawSection('Experience');
  workExperiences.forEach((exp) => {
    drawBlock(`${exp.job_title || ''} | ${exp.company_name || ''}`, { size: 11.5, font: fontBold, spacing: 15 });
    drawBlock(`${exp.start_date_employment || ''} - ${exp.end_date_employment || ''}`, {
      size: 9.5,
      color: style.colors.faded,
      spacing: 12
    });
    (exp.achievements || []).slice(0, 8).forEach((achievement) => drawBlock(`• ${achievement}`, { size: 10 }));
    y -= 8;
  });

  drawSection('Skills');
  Object.entries(technicalSkills).forEach(([category, skills]) => {
    drawBlock(`${category}: ${(skills || []).join(', ')}`, { size: 10.5, spacing: 13 });
  });
  y -= 6;

  drawSection('Education');
  drawBlock(`${education.educationLevel || ''} | ${education.institution || ''}`, { size: 11, font: fontBold });
  drawBlock(`${education.startDate || ''} - ${education.yearOfCompletion || ''}`, { size: 10, color: style.colors.faded });

  return pdfDoc.save();
}

async function generateTemplate5(data) {
  const style = {
    marginX: 30,
    marginY: 32,
    minY: 44,
    lineHeight: 13,
    header: {
      height: 132,
      nameY: 56,
      positionY: 86,
      contactY: 110
    },
    colors: {
      headerBg: rgb(0.11, 0.16, 0.24),
      headerText: rgb(0.98, 0.98, 0.98),
      accent: rgb(0.84, 0.48, 0.18),
      dark: rgb(0.16, 0.16, 0.16),
      faded: rgb(0.45, 0.45, 0.45)
    }
  };

  const education = getEducationEntry(data);
  const summary = getSafeSummary(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  const { fontRegular, fontBold, fontItalic } = await loadHelveticaFonts(pdfDoc);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - style.header.height;
  const maxWidth = width - style.marginX * 2;

  page.drawRectangle({
    x: 0,
    y: height - style.header.height,
    width,
    height: style.header.height,
    color: style.colors.headerBg
  });

  const wrap = (text, font, size, availableWidth) => {
    const words = sanitizeText(text || '').split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > availableWidth) {
        if (line) lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }

    if (line) lines.push(line);
    return lines;
  };

  const addPage = () => {
    page = pdfDoc.addPage();
    y = height - style.marginY;
  };

  const drawTextBlock = (text, opts = {}) => {
    const { size = 10.5, font = fontRegular, color = style.colors.dark, x = style.marginX, spacing = style.lineHeight } = opts;
    const lines = wrap(text, font, size, maxWidth);
    for (const line of lines) {
      if (y < style.minY) addPage();
      page.drawText(line, { x, y, size, font, color });
      y -= spacing;
    }
  };

  const drawSection = (title) => {
    if (y < style.minY + 20) addPage();
    page.drawText(sanitizeText(title.toUpperCase()), {
      x: style.marginX,
      y,
      size: 15,
      font: fontBold,
      color: style.colors.accent
    });
    y -= 16;
  };

  page.drawText(sanitizeText(data.name || ''), {
    x: style.marginX,
    y: height - style.header.nameY,
    size: 24,
    font: fontBold,
    color: style.colors.headerText
  });
  page.drawText(sanitizeText(data.target_position || ''), {
    x: style.marginX,
    y: height - style.header.positionY,
    size: 12,
    font: fontItalic,
    color: style.colors.headerText
  });
  page.drawText(sanitizeText([data.email, data.mobile, data.linkedin].filter(Boolean).join(' | ')), {
    x: style.marginX,
    y: height - style.header.contactY,
    size: 9.5,
    font: fontRegular,
    color: style.colors.headerText
  });

  y -= 24;
  drawSection('Summary');
  summary.forEach((item) => drawTextBlock(`• ${item}`));
  y -= 16;

  drawSection('Experience');
  workExperiences.forEach((exp) => {
    drawTextBlock(`${exp.job_title || ''} | ${exp.company_name || ''}`, { size: 11, font: fontBold });
    drawTextBlock(`${exp.start_date_employment || ''} - ${exp.end_date_employment || ''}`, {
      size: 9.5,
      color: style.colors.faded
    });
    (exp.achievements || []).slice(0, 8).forEach((achievement) => drawTextBlock(`• ${achievement}`));
    y -= 10;
  });

  drawSection('Skills');
  Object.entries(technicalSkills).forEach(([category, skills]) => {
    drawTextBlock(`${category}: ${(skills || []).join(', ')}`);
  });
  y -= 8;

  drawSection('Education');
  drawTextBlock(`${education.educationLevel || ''} | ${education.institution || ''}`, { font: fontBold });
  drawTextBlock(`${education.startDate || ''} - ${education.yearOfCompletion || ''}`, { color: style.colors.faded });

  return pdfDoc.save();
}

async function generateTemplate6(data) {
  const style = {
    marginX: 34,
    marginY: 34,
    minY: 46,
    lineHeight: 13,
    fontSize: {
      sectionTitle: 14
    },
    section: {
      dividerOffset: 4,
      bottomGap: 20
    },
    colors: {
      accent: rgb(0.58, 0.22, 0.12),
      softAccent: rgb(0.83, 0.72, 0.63),
      dark: rgb(0.13, 0.13, 0.13),
      faded: rgb(0.42, 0.42, 0.42)
    }
  };

  const education = getEducationEntry(data);
  const summary = getSafeSummary(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  const { fontRegular, fontBold, fontItalic } = await loadHelveticaFonts(pdfDoc);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - style.marginY;
  const contentWidth = width - style.marginX * 2;

  const wrap = (text, font, size, availableWidth) => {
    return wrapTextWithLongWordBreak(text, font, size, availableWidth);
  };

  const addPage = () => {
    page = pdfDoc.addPage();
    y = height - style.marginY;
  };

  const drawCenteredLines = (text, opts = {}) => {
    const { size = 12, font = fontRegular, color = style.colors.dark, spacing = style.lineHeight + 1 } = opts;
    const lines = wrap(text, font, size, contentWidth);

    for (const line of lines) {
      if (y < style.minY) addPage();
      const lineWidth = font.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: (width - lineWidth) / 2,
        y,
        size,
        font,
        color
      });
      y -= spacing;
    }
  };

  const drawTextBlock = (text, opts = {}) => {
    const { size = 10, font = fontRegular, color = style.colors.dark, spacing = style.lineHeight, indent = 0 } = opts;
    const lines = wrap(text, font, size, contentWidth - indent);

    for (const line of lines) {
      if (y < style.minY) addPage();
      page.drawText(line, {
        x: style.marginX + indent,
        y,
        size,
        font,
        color
      });
      y -= spacing;
    }
  };

  const drawRowBorders = (startX, rowY, rowHeight, colWidths) => {
    const totalWidth = colWidths.reduce((sum, value) => sum + value, 0);

    page.drawLine({
      start: { x: startX, y: rowY },
      end: { x: startX + totalWidth, y: rowY },
      thickness: 0.8,
      color: style.colors.softAccent
    });
    page.drawLine({
      start: { x: startX, y: rowY - rowHeight },
      end: { x: startX + totalWidth, y: rowY - rowHeight },
      thickness: 0.8,
      color: style.colors.softAccent
    });

    let x = startX;
    for (const colWidth of colWidths) {
      page.drawLine({
        start: { x, y: rowY },
        end: { x, y: rowY - rowHeight },
        thickness: 0.8,
        color: style.colors.softAccent
      });
      x += colWidth;
    }

    page.drawLine({
      start: { x, y: rowY },
      end: { x, y: rowY - rowHeight },
      thickness: 0.8,
      color: style.colors.softAccent
    });
  };

  const drawSkillsTable = () => {
    const skillEntries = Object.entries(technicalSkills);
    if (!skillEntries.length) {
      return;
    }

    const tablePadding = 5;
    const categoryFontSize = 11.2;
    const skillFontSize = 9.2;
    const categoryWidth = 150;
    const skillsWidth = contentWidth - categoryWidth;
    const colWidths = [categoryWidth, skillsWidth];
    const startX = style.marginX;

    const wrapCell = (text, font, size, availableWidth) => wrap(text, font, size, availableWidth - tablePadding * 2);

    const drawTableRow = (rowY, categoryText, skillsText, isHeader = false) => {
      const categoryLines = wrapCell(categoryText, fontBold, categoryFontSize, categoryWidth);
      const skillLines = wrapCell(skillsText, fontRegular, skillFontSize, skillsWidth);
      const maxLines = Math.max(categoryLines.length, skillLines.length);
      const rowHeight = Math.max(22, maxLines * 12 + tablePadding * 2);

      if (y - rowHeight < style.minY) {
        addPage();
        rowY = y;
      }

      if (isHeader) {
        page.drawRectangle({
          x: startX,
          y: rowY - rowHeight,
          width: contentWidth,
          height: rowHeight,
          color: rgb(0.98, 0.96, 0.94)
        });
      }

      categoryLines.forEach((line, index) => {
        page.drawText(sanitizeText(line), {
          x: startX + tablePadding,
          y: rowY - tablePadding - categoryFontSize - index * 12,
          size: categoryFontSize,
          font: fontBold,
          color: style.colors.accent
        });
      });

      skillLines.forEach((line, index) => {
        page.drawText(sanitizeText(line), {
          x: startX + categoryWidth + tablePadding,
          y: rowY - tablePadding - skillFontSize - index * 12,
          size: skillFontSize,
          font: fontRegular,
          color: style.colors.dark
        });
      });

      drawRowBorders(startX, rowY, rowHeight, colWidths);
      y = rowY - rowHeight;
    };

    drawTableRow(y, 'Category', 'Skills', true);

    skillEntries.forEach(([category, skills]) => {
      drawTableRow(y, category, (skills || []).join(', '));
    });
  };

  const drawSection = (title) => {
    if (y < style.minY + 24) addPage();
    const sectionTitle = sanitizeText(title.toUpperCase());
    page.drawText(sectionTitle, {
      x: style.marginX,
      y,
      size: style.fontSize.sectionTitle,
      font: fontBold,
      color: style.colors.accent
    });

    const titleWidth = fontBold.widthOfTextAtSize(sectionTitle, style.fontSize.sectionTitle);
    page.drawLine({
      start: { x: style.marginX + titleWidth + 10, y: y + style.section.dividerOffset },
      end: { x: width - style.marginX, y: y + style.section.dividerOffset },
      thickness: 1,
      color: style.colors.softAccent
    });
    y -= style.section.bottomGap;
  };

  const drawExperienceHeader = (exp) => {
    if (y < style.minY + 30) addPage();

    const leftLabel = sanitizeText(`${exp.job_title || ''} | ${exp.company_name || ''}`);
    const rightLabel = sanitizeText(`${exp.start_date_employment || ''} - ${exp.end_date_employment || ''}`);
    const rightWidth = fontRegular.widthOfTextAtSize(rightLabel, 9);
    const leftWidth = contentWidth - rightWidth - 12;
    const leftLines = wrap(leftLabel, fontBold, 10.5, Math.max(leftWidth, 120));

    for (let index = 0; index < leftLines.length; index += 1) {
      const line = leftLines[index];
      if (y < style.minY) addPage();
      page.drawText(line, {
        x: style.marginX,
        y,
        size: 10.5,
        font: fontBold,
        color: style.colors.dark
      });

      if (index === 0) {
        page.drawText(rightLabel, {
          x: width - style.marginX - rightWidth,
          y,
          size: 9,
          font: fontRegular,
          color: style.colors.faded
        });
      }

      y -= style.lineHeight;
    }
  };

  drawCenteredLines(data.name || '', { size: 22, font: fontBold, spacing: 22 });
  y -= 2;
  drawCenteredLines(data.target_position || '', { size: 12, font: fontItalic, color: style.colors.accent, spacing: 16 });
  drawCenteredLines([data.email, data.mobile, data.linkedin, data.address].filter(Boolean).join(' | '), {
    size: 9,
    font: fontRegular,
    color: style.colors.faded,
    spacing: 12
  });
  y -= 14;

  drawSection('Summary');
  summary.forEach((item) => drawTextBlock(`• ${item}`, { size: 10 }));
  y -= 10;

  drawSection('Skills');
  drawSkillsTable();
  y -= 24;

  drawSection('Experience');
  workExperiences.forEach((exp) => {
    drawExperienceHeader(exp);
    (exp.achievements || []).slice(0, 7).forEach((achievement) => {
      drawTextBlock(`• ${achievement}`, { size: 9.2, indent: 10, spacing: 12 });
    });
    y -= 8;
  });

  drawSection('Education');
  drawTextBlock(`${education.educationLevel || ''} | ${education.institution || ''}`, { size: 10, font: fontBold });
  drawTextBlock(`${education.startDate || ''} - ${education.yearOfCompletion || ''}`, {
    size: 9,
    color: style.colors.faded
  });

  return pdfDoc.save();
}

async function generateTemplate7(data) {
  const style = {
    marginX: 30,
    marginY: 28,
    minY: 42,
    lineHeight: 11,
    sectionBarHeight: 24,
    colors: {
      barBg: rgb(0.93, 0.93, 0.93),
      dark: rgb(0.11, 0.11, 0.11),
      faded: rgb(0.4, 0.4, 0.4)
    }
  };

  const education = getEducationEntry(data);
  const summary = getSafeSummary(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  const { fontRegular, fontBold, fontItalic } = await loadTimesFonts(pdfDoc);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - style.marginY;
  const maxWidth = width - style.marginX * 2;

  const wrap = (text, font, size, availableWidth) => wrapTextWithLongWordBreak(text, font, size, availableWidth);

  const drawCenteredHeaderText = (text, yPos, opts = {}) => {
    const { size = 10, font = fontRegular, color = style.colors.headerText, maxWidth = contentWidth, spacing = style.lineHeight } = opts;
    const lines = wrap(text, font, size, maxWidth);
    let currentY = yPos;

    for (const line of lines) {
      const safeLine = sanitizeText(line);
      const lineWidth = font.widthOfTextAtSize(safeLine, size);
      page.drawText(safeLine, {
        x: (width - lineWidth) / 2,
        y: currentY,
        size,
        font,
        color
      });
      currentY -= spacing;
    }
  };

  const addPage = () => {
    page = pdfDoc.addPage();
    y = height - style.marginY;
  };

  const drawTextBlock = (text, opts = {}) => {
    const { size = 9.5, font = fontRegular, color = style.colors.dark, x = style.marginX, spacing = style.lineHeight } = opts;
    const lines = wrap(text, font, size, maxWidth - (x - style.marginX));
    for (const line of lines) {
      if (y < style.minY) addPage();
      page.drawText(line, { x, y, size, font, color });
      y -= spacing;
    }
  };

  const drawSectionBar = (title) => {
    if (y < style.minY + 28) addPage();
    const safeTitle = sanitizeText(title.toUpperCase());
    const sectionTitleSize = 14;
    const barY = y - style.sectionBarHeight + 4;
    const titleWidth = fontBold.widthOfTextAtSize(safeTitle, sectionTitleSize);
    const titleY = barY + (style.sectionBarHeight - sectionTitleSize) / 2 + 1;

    page.drawRectangle({
      x: style.marginX,
      y: barY,
      width: maxWidth,
      height: style.sectionBarHeight,
      color: style.colors.barBg
    });
    page.drawText(safeTitle, {
      x: style.marginX + (maxWidth - titleWidth) / 2,
      y: titleY,
      size: sectionTitleSize,
      font: fontBold,
      color: style.colors.dark
    });
    y -= 28;
  };

  const drawContactLine = () => {
    const contactParts = [
      data.email ? ` ${data.email} |` : null,
      data.mobile ? ` ${data.mobile} |` : null,
      data.linkedin ? ` ${data.linkedin} |` : null,
      data.address ? ` ${data.address}` : null
    ].filter(Boolean);

    drawTextBlock(contactParts.join('    '), {
      size: 8.4,
      color: style.colors.dark,
      spacing: 10
    });
  };

  const drawExperienceItem = (exp) => {
    if (y < style.minY + 38) addPage();

    const roleWidth = fontBold.widthOfTextAtSize(sanitizeText(exp.job_title || ''), 10.5);
    page.drawText(sanitizeText(exp.job_title || ''), {
      x: style.marginX,
      y,
      size: 10,
      font: fontBold,
      color: style.colors.dark
    });

    page.drawText(sanitizeText(exp.company_name || ''), {
      x: style.marginX,
      y: y - 11,
      size: 9.5,
      font: fontItalic,
      color: style.colors.dark
    });

    const periodParts = [exp.start_date_employment || '', exp.end_date_employment || ''].filter(Boolean).join(' - ');
    const periodText = sanitizeText(periodParts);
    const periodWidth = fontRegular.widthOfTextAtSize(periodText, 9);
    page.drawText(periodText, {
      x: width - style.marginX - periodWidth,
      y,
      size: 9,
      font: fontRegular,
      color: style.colors.dark
    });

    y -= 24;
    (exp.achievements || []).slice(0, 6).forEach((achievement) => {
      drawTextBlock(`• ${achievement}`, { size: 8.8, spacing: 10, x: style.marginX + 8 });
    });
    y -= 4;
  };

  const drawSkillsColumns = () => {
    const skills = Object.values(technicalSkills).flat();
    if (!skills.length) {
      return;
    }

    const half = Math.ceil(skills.length / 2);
    const columns = [skills.slice(0, half), skills.slice(half)];
    const columnWidth = (maxWidth - 20) / 2;
    let localY = y;

    columns.forEach((columnSkills, columnIndex) => {
      let columnY = localY;
      columnSkills.forEach((skill) => {
        const lines = wrap(`• ${skill}`, fontRegular, 8.8, columnWidth);
        lines.forEach((line) => {
          page.drawText(line, {
            x: style.marginX + columnIndex * (columnWidth + 20),
            y: columnY,
            size: 10,
            font: fontRegular,
            color: style.colors.dark
          });
          columnY -= 10;
        });
      });
      localY = Math.max(localY, columnY);
    });

    y = localY - 6;
  };

  const drawSummaryBullets = () => {
    summary.forEach((item) => {
      drawTextBlock(`• ${item}`, { size: 9.1, spacing: 10, x: style.marginX + 8 });
    });
  };

  const nameText = sanitizeText(data.name || '');
  page.drawText(nameText, {
    x: style.marginX,
    y,
    size: 17,
    font: fontRegular,
    color: style.colors.dark
  });

  const nameWidth = fontRegular.widthOfTextAtSize(nameText, 17);
  page.drawText(sanitizeText(data.target_position || ''), {
    x: style.marginX + nameWidth + 12,
    y: y + 1,
    size: 10,
    font: fontItalic,
    color: style.colors.dark
  });
  y -= 20;
  drawContactLine();
  y -= 10;

  drawSectionBar('Summary');
  drawSummaryBullets();
  y -= 6;

  drawSectionBar('Professional Experience');
  workExperiences.forEach(drawExperienceItem);

  drawSectionBar('Education');
  drawTextBlock(`${education.educationLevel || ''}`, { size: 9.5, font: fontBold });
  drawTextBlock(`${education.institution || ''}`, { size: 8.8, font: fontItalic });
  drawTextBlock(`${education.startDate || ''} - ${education.yearOfCompletion || ''}`, { size: 8.8, color: style.colors.dark });
  y -= 6;

  drawSectionBar('Skills');
  drawSkillsColumns();

  return pdfDoc.save();
}

async function generateTemplate8(data) {
  const style = {
    marginX: 28,
    marginY: 30,
    minY: 42,
    lineHeight: 12,
    colors: {
      accent: rgb(0.04, 0.47, 0.45),
      accentSoft: rgb(0.86, 0.95, 0.94),
      dark: rgb(0.1, 0.13, 0.16),
      faded: rgb(0.42, 0.46, 0.5)
    }
  };

  const education = getEducationEntry(data);
  const summary = getSafeSummary(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  const { fontRegular, fontBold, fontItalic } = await loadCourierFonts(pdfDoc);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - style.marginY;
  const contentWidth = width - style.marginX * 2;

  const addPage = () => {
    page = pdfDoc.addPage();
    y = height - style.marginY;
  };

  const wrap = (text, font, size, availableWidth) => wrapTextWithLongWordBreak(text, font, size, availableWidth);

  const drawBlock = (text, opts = {}) => {
    const { x = style.marginX, size = 9.5, font = fontRegular, color = style.colors.dark, spacing = style.lineHeight } = opts;
    const lines = wrap(text, font, size, contentWidth - (x - style.marginX));

    for (const line of lines) {
      if (y < style.minY) addPage();
      page.drawText(line, { x, y, size, font, color });
      y -= spacing;
    }
  };

  const drawSection = (title) => {
    if (y < style.minY + 24) addPage();

    page.drawRectangle({
      x: style.marginX,
      y: y - 14,
      width: contentWidth,
      height: 18,
      color: style.colors.accentSoft
    });
    page.drawText(sanitizeText(title.toUpperCase()), {
      x: style.marginX + 8,
      y: y - 9,
      size: 10,
      font: fontBold,
      color: style.colors.accent
    });
    y -= 24;
  };

  drawBlock(data.name || '', { size: 19, font: fontBold, spacing: 18 });
  drawBlock(data.target_position || '', { size: 11, font: fontItalic, color: style.colors.accent, spacing: 15 });
  drawBlock([data.email, data.mobile, data.linkedin, data.address].filter(Boolean).join(' | '), {
    size: 8.5,
    color: style.colors.faded,
    spacing: 11
  });
  y -= 8;

  drawSection('Summary');
  summary.forEach((item) => drawBlock(`- ${item}`, { size: 9.2 }));
  y -= 6;

  drawSection('Technical Skills');
  Object.entries(technicalSkills).forEach(([category, skills]) => {
    drawBlock(`${category}: ${(skills || []).join(', ')}`, { size: 9.2, spacing: 11.5 });
  });
  y -= 6;

  drawSection('Experience');
  workExperiences.forEach((exp) => {
    drawBlock(`${exp.job_title || ''} @ ${exp.company_name || ''}`, { size: 10.2, font: fontBold, spacing: 13 });
    drawBlock(`${exp.start_date_employment || ''} - ${exp.end_date_employment || ''}`, {
      size: 8.5,
      font: fontItalic,
      color: style.colors.faded,
      spacing: 11
    });
    (exp.achievements || []).slice(0, 8).forEach((achievement) => drawBlock(`- ${achievement}`, { x: style.marginX + 8, size: 8.8 }));
    y -= 6;
  });

  drawSection('Education');
  drawBlock(`${education.educationLevel || ''} | ${education.institution || ''}`, { size: 9.8, font: fontBold });
  drawBlock(`${education.startDate || ''} - ${education.yearOfCompletion || ''}`, {
    size: 8.6,
    font: fontItalic,
    color: style.colors.faded
  });

  return pdfDoc.save();
}

async function generateTemplate9(data) {
  const style = {
    marginX: 34,
    marginY: 34,
    sidebarWidth: 165,
    minY: 42,
    lineHeight: 12,
    colors: {
      sidebarBg: rgb(0.95, 0.93, 0.88),
      heading: rgb(0.12, 0.26, 0.31),
      accent: rgb(0.72, 0.38, 0.23),
      dark: rgb(0.18, 0.18, 0.17),
      faded: rgb(0.44, 0.42, 0.38)
    }
  };

  const education = getEducationEntry(data);
  const summary = getSafeSummary(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  const { fontRegular, fontBold } = await loadBitterFonts(pdfDoc);
  const { fontItalic } = await loadTimesFonts(pdfDoc);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  const sidebarX = style.marginX;
  const sidebarWidth = style.sidebarWidth;
  const contentX = sidebarX + sidebarWidth + 26;
  const contentWidth = width - contentX - style.marginX;
  let leftY = height - style.marginY;
  let rightY = height - style.marginY;

  const drawSidebarBackground = () => {
    page.drawRectangle({
      x: sidebarX - 10,
      y: 0,
      width: sidebarWidth + 20,
      height,
      color: style.colors.sidebarBg
    });
  };

  const addPage = () => {
    page = pdfDoc.addPage();
    drawSidebarBackground();
    return height - style.marginY;
  };

  drawSidebarBackground();

  const wrap = (text, font, size, availableWidth) => wrapTextWithLongWordBreak(text, font, size, availableWidth);

  const drawLines = (textOrLines, opts) => {
    const { x, yRef, size, font, color, maxWidth, spacing = style.lineHeight } = opts;
    const lines = Array.isArray(textOrLines) ? textOrLines : wrap(textOrLines, font, size, maxWidth);
    let currentY = yRef;

    for (const line of lines) {
      if (currentY < style.minY) {
        currentY = addPage();
      }

      page.drawText(sanitizeText(line), { x, y: currentY, size, font, color });
      currentY -= spacing;
    }

    return currentY;
  };

  const drawRightSection = (title) => {
    rightY = drawLines(title.toUpperCase(), {
      x: contentX,
      yRef: rightY,
      size: 11.5,
      font: fontBold,
      color: style.colors.heading,
      maxWidth: contentWidth,
      spacing: 14
    });
    page.drawLine({
      start: { x: contentX, y: rightY + 8 },
      end: { x: width - style.marginX, y: rightY + 8 },
      thickness: 1,
      color: style.colors.accent
    });
    rightY -= 4;
  };

  leftY = drawLines(data.name || '', {
      x: sidebarX,
      yRef: leftY,
      size: 18,
      font: fontBold,
      color: style.colors.heading,
      maxWidth: sidebarWidth,
      spacing: 18
    });
  leftY = drawLines(data.target_position || '', {
    x: sidebarX,
    yRef: leftY - 2,
    size: 10.5,
    font: fontItalic,
    color: style.colors.accent,
    maxWidth: sidebarWidth,
    spacing: 14
  });
  leftY = drawLines('CONTACT', {
      x: sidebarX,
      yRef: leftY - 10,
      size: 10,
      font: fontBold,
      color: style.colors.heading,
      maxWidth: sidebarWidth
    });
  leftY = drawLines([data.mobile, data.email, data.linkedin, data.address].filter(Boolean), {
    x: sidebarX,
    yRef: leftY - 4,
    size: 8.8,
    font: fontRegular,
    color: style.colors.dark,
    maxWidth: sidebarWidth,
    spacing: 11
  });
  leftY = drawLines('SKILLS', {
      x: sidebarX,
      yRef: leftY - 8,
      size: 10,
      font: fontBold,
      color: style.colors.heading,
      maxWidth: sidebarWidth
    });
  leftY -= 4;

  Object.entries(technicalSkills).forEach(([category, skills]) => {
    leftY = drawLines(category, {
      x: sidebarX,
      yRef: leftY,
      size: 8.8,
      font: fontBold,
      color: style.colors.accent,
      maxWidth: sidebarWidth,
      spacing: 10
    });
    leftY = drawLines((skills || []).join(', '), {
      x: sidebarX,
      yRef: leftY - 1,
      size: 8.1,
      font: fontRegular,
      color: style.colors.dark,
      maxWidth: sidebarWidth,
      spacing: 9
    });
    leftY -= 3;
  });

  drawRightSection('Summary');
  summary.forEach((line) => {
    rightY = drawLines(`• ${line}`, {
      x: contentX,
      yRef: rightY,
      size: 9.2,
      font: fontRegular,
      color: style.colors.dark,
      maxWidth: contentWidth,
      spacing: 12
    });
  });
  rightY -= 8;

  drawRightSection('Experience');
  workExperiences.forEach((exp) => {
    rightY = drawLines(exp.job_title || '', {
      x: contentX,
      yRef: rightY,
      size: 10.5,
      font: fontBold,
      color: style.colors.dark,
      maxWidth: contentWidth,
      spacing: 13
    });
    rightY = drawLines(`${exp.company_name || ''} | ${exp.start_date_employment || ''} - ${exp.end_date_employment || ''}`, {
      x: contentX,
      yRef: rightY,
      size: 8.8,
      font: fontItalic,
      color: style.colors.accent,
      maxWidth: contentWidth,
      spacing: 11
    });
    (exp.achievements || []).slice(0, 7).forEach((achievement) => {
      rightY = drawLines(`• ${achievement}`, {
        x: contentX + 4,
        yRef: rightY,
        size: 8.8,
        font: fontRegular,
        color: style.colors.dark,
        maxWidth: contentWidth - 4,
        spacing: 11
      });
    });
    rightY -= 6;
  });

  drawRightSection('Education');
  drawLines(`${education.educationLevel || ''}`, {
    x: contentX,
    yRef: rightY,
    size: 9.5,
    font: fontBold,
    color: style.colors.dark,
    maxWidth: contentWidth,
    spacing: 12
  });
  drawLines(`${education.institution || ''} | ${education.startDate || ''} - ${education.yearOfCompletion || ''}`, {
    x: contentX,
    yRef: rightY - 12,
    size: 8.8,
    font: fontItalic,
    color: style.colors.faded,
    maxWidth: contentWidth,
    spacing: 11
  });

  return pdfDoc.save();
}

async function generateTemplate10(data) {
  const style = {
    marginX: 40,
    marginY: 34,
    minY: 44,
    lineHeight: 13,
    header: {
      height: 110,
      nameY: 54,
      titleY: 80,
      contactY: 100
    },
    colors: {
      plum: rgb(0.27, 0.16, 0.29),
      rose: rgb(0.61, 0.32, 0.36),
      dark: rgb(0.15, 0.13, 0.15),
      faded: rgb(0.45, 0.42, 0.46),
      soft: rgb(0.93, 0.9, 0.91),
      headerText: rgb(0.98, 0.97, 0.98)
    }
  };

  const education = getEducationEntry(data);
  const summary = getSafeSummary(data);
  const workExperiences = getSafeWorkExperiences(data);
  const technicalSkills = getSafeTechnicalSkills(data);

  const pdfDoc = await PDFDocument.create();
  const { fontRegular, fontBold, fontItalic } = await loadTimesFonts(pdfDoc);
  let page = pdfDoc.addPage();
  const { width, height } = page.getSize();
  let y = height - style.header.height - 26;
  const contentWidth = width - style.marginX * 2;

  const addPage = () => {
    page = pdfDoc.addPage();
    y = height - style.marginY;
  };

  const wrap = (text, font, size, availableWidth) => wrapTextWithLongWordBreak(text, font, size, availableWidth);

  const drawCenteredHeaderText = (text, yPos, opts = {}) => {
    const { size = 10, font = fontRegular, color = style.colors.headerText, maxWidth = contentWidth, spacing = style.lineHeight } = opts;
    const lines = wrap(text, font, size, maxWidth);
    let currentY = yPos;

    for (const line of lines) {
      const safeLine = sanitizeText(line);
      const lineWidth = font.widthOfTextAtSize(safeLine, size);
      page.drawText(safeLine, {
        x: (width - lineWidth) / 2,
        y: currentY,
        size,
        font,
        color
      });
      currentY -= spacing;
    }
  };

  const drawBlock = (text, opts = {}) => {
    const { x = style.marginX, size = 10, font = fontRegular, color = style.colors.dark, spacing = style.lineHeight } = opts;
    const lines = wrap(text, font, size, contentWidth - (x - style.marginX));
    for (const line of lines) {
      if (y < style.minY) addPage();
      page.drawText(line, { x, y, size, font, color });
      y -= spacing;
    }
  };

  const drawSection = (title) => {
    if (y < style.minY + 24) addPage();
    page.drawText(sanitizeText(title.toUpperCase()), {
      x: style.marginX,
      y,
      size: 11,
      font: fontBold,
      color: style.colors.plum
    });
    const titleWidth = fontBold.widthOfTextAtSize(sanitizeText(title.toUpperCase()), 11);
    page.drawLine({
      start: { x: style.marginX + titleWidth + 10, y: y + 5 },
      end: { x: width - style.marginX, y: y + 5 },
      thickness: 0.8,
      color: style.colors.rose
    });
    y -= 16;
  };

  page.drawRectangle({
    x: 0,
    y: height - style.header.height,
    width,
    height: style.header.height,
    color: style.colors.plum
  });
  page.drawRectangle({
    x: 0,
    y: height - style.header.height,
    width,
    height: 8,
    color: style.colors.rose
  });

  drawCenteredHeaderText(data.name || '', height - style.header.nameY, {
    size: 24,
    font: fontBold,
    color: style.colors.headerText,
    spacing: 20
  });
  drawCenteredHeaderText(data.target_position || '', height - style.header.titleY, {
    size: 12,
    font: fontItalic,
    color: style.colors.soft,
    spacing: 14
  });
  drawCenteredHeaderText([data.email, data.mobile, data.linkedin, data.address].filter(Boolean).join(' | '), height - style.header.contactY, {
    size: 9,
    font: fontRegular,
    color: style.colors.headerText,
    spacing: 11
  });

  drawSection('Summary');
  summary.forEach((item) => drawBlock(`• ${item}`, { size: 9.6, spacing: 12 }));
  y -= 6;

  drawSection('Experience');
  workExperiences.forEach((exp) => {
    drawBlock(`${exp.job_title || ''}`, { size: 11, font: fontBold, spacing: 14 });
    drawBlock(`${exp.company_name || ''} | ${exp.start_date_employment || ''} - ${exp.end_date_employment || ''}`, {
      size: 9,
      font: fontItalic,
      color: style.colors.rose,
      spacing: 11
    });
    (exp.achievements || []).slice(0, 8).forEach((achievement) => drawBlock(`• ${achievement}`, { x: style.marginX + 8, size: 9.2, spacing: 11.5 }));
    y -= 6;
  });

  drawSection('Technical Skills');
  Object.entries(technicalSkills).forEach(([category, skills]) => {
    drawBlock(`${category}: ${(skills || []).join(', ')}`, { size: 9.4, spacing: 11.5 });
  });
  y -= 6;

  drawSection('Education');
  drawBlock(`${education.educationLevel || ''}`, { size: 10, font: fontBold });
  drawBlock(`${education.institution || ''}`, { size: 9.2, font: fontItalic, color: style.colors.rose });
  drawBlock(`${education.startDate || ''} - ${education.yearOfCompletion || ''}`, { size: 8.8, color: style.colors.faded });

  return pdfDoc.save();
}

export async function buildResumePdf(data, template = 'template1') {
  switch (template) {
    case 'template2':
      return generateTemplate2(data);
    case 'template3':
      return generateTemplate3(data);
    case 'template4':
      return generateTemplate4(data);
    case 'template5':
      return generateTemplate5(data);
    case 'template6':
      return generateTemplate6(data);
    case 'template7':
      return generateTemplate7(data);
    case 'template8':
      return generateTemplate8(data);
    case 'template9':
      return generateTemplate9(data);
    case 'template10':
      return generateTemplate10(data);
    case 'template1':
    default:
      return generateTemplate1(data);
  }
}
