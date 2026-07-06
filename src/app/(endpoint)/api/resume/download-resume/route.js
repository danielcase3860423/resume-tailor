export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { formatPhoneNumber } from '@/helpers/common';
import { sanitizeText, sendError, buildResumeFilename, shortenLinkedIn } from '@/helpers/endpoint';
import profileModel from '@/models/profile.model';
import dbConnect from '@/mongodb';
import { findResumeByIdAcrossClusters } from '@/mongodb-resume';
import { buildResumePdf } from '@/services/(endpoint)/resumes/resume-pdf';

export const POST = async (req) => {
  try {
    await dbConnect();

    const { profileId, resumeId } = await req.json();
    const profile = await profileModel.findById(profileId);
    const resume = await findResumeByIdAcrossClusters(resumeId);
    if (!resume) {
      return sendError(Response, { msg: 'Resume not found' });
    }
    const completion = resume.resumeResponse;
    const addr = profile.profileAddress;
    const address =
      addr.street || addr.city || addr.state || addr.zip ? [addr.street, addr.city, addr.state, addr.zip].filter(Boolean).join(', ') : '';

    const data = {
      name: sanitizeText(profile.profileName),
      mobile: sanitizeText(formatPhoneNumber(profile.profileMobile)),
      email: sanitizeText(profile.profileEmail),
      linkedin: sanitizeText(shortenLinkedIn(profile.profileLinkedIn)),
      address: sanitizeText(address),
      education: profile.profileEducation
    };
    const r = { ...data, ...completion };

    const profileTemplate = profile?.profileTemplate || 'template2';
    const resume_name = buildResumeFilename({ name: r.name });

    const pdfBytes = await buildResumePdf(r, profileTemplate);

    return new Response(new Uint8Array(Buffer.from(pdfBytes)), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${resume_name}.pdf"`
      }
    });
  } catch (error) {
    console.log(error);
    return sendError(Response, { msg: error?.message || 'Unknown error' });
  }
};

