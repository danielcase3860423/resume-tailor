'use client';
import { Select, Input, Space } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useGlobalContext } from '@/context/auth';
import { analyzeJobDescriptionRestrictions, showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
import {
  ContentWrapper,
  StyledButton,
  PageShell,
  SurfaceCard
} from '@/_components/layout/client/styled';
import profileService from '@/services/(routes)/profiles';

const { TextArea } = Input;
const CHAT_STARTER_QUESTIONS = [
  'Why are you interested in this role?',
  'Why are you a good fit for this position?',
  'How would you answer a question about relevant experience?',
  'Write a concise answer for why this company interests you.'
];

function cleanProfileDisplayValue(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '-';
  }

  const openParenCount = (text.match(/\(/g) || []).length;
  const closeParenCount = (text.match(/\)/g) || []).length;

  if (openParenCount === closeParenCount) {
    return text;
  }

  if (openParenCount > closeParenCount) {
    return text.replace(/\([^()]*$/g, '').trim() || '-';
  }

  return text.replace(/\)+$/g, '').trim() || '-';
}

export default function ResumePage() {
  const { loginUser } = useGlobalContext();
  const { user: currentUser } = loginUser;
  const [jobUrl, setUrl] = useState('');
  const [jobDesc, setDesc] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [position, setPosition] = useState('');
  const [isWorking, setWorking] = useState(false);
  const [can, setCan] = useState(false);
  const [isCovering, setCovering] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState('');
  const [acknowledgedLocationWarningKey, setAcknowledgedLocationWarningKey] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [isAnswering, setAnswering] = useState(false);

  const fetchProfiles = async () => {
    try {
      const data = await profileService.getProfilesByUserId();
      if (!data.error) setProfiles(data.profiles || []);
      else showToastErrorMsg(data.msg);
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Failed to load profiles.');
    }
  };

  useEffect(() => {
    if (loginUser && currentUser) fetchProfiles();
  }, [loginUser, currentUser]);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => String(profile._id) === String(profileId)) || null,
    [profiles, profileId]
  );

  const selectedProfileInfo = useMemo(() => {
    if (!selectedProfile) {
      return [];
    }

    return [
      { label: 'Full Name', value: cleanProfileDisplayValue(selectedProfile.profileName) },
      { label: 'Email', value: cleanProfileDisplayValue(selectedProfile.profileEmail) },
      { label: 'LinkedIn', value: cleanProfileDisplayValue(selectedProfile.profileLinkedIn) },
      { label: 'Phone', value: cleanProfileDisplayValue(selectedProfile.profileMobile) }
    ];
  }, [selectedProfile]);

  const getLocationWarningKey = () => String(jobDesc || '').trim().toLowerCase();

  const resetChat = () => {
    setChatMessages([]);
  };

  const generateResumePDF = async () => {
    if (!jobUrl) return showToastErrorMsg('Please enter a valid Job URL');
    if (!profileId) return showToastErrorMsg('Please select a Profile');
    if (!jobDesc) return showToastErrorMsg('Please enter a Job Description');

    const restrictions = analyzeJobDescriptionRestrictions(jobDesc);
    if (restrictions.hasSecurityClearanceRequirement) {
      return showToastErrorMsg('This job appears to require security clearance. Resume generation was stopped.');
    }

    if (restrictions.shouldBlockResumeGeneration) {
      return showToastErrorMsg('This job appears to require security clearance. Resume generation was stopped.');
    }

    if (restrictions.hasLocationReviewWarning) {
      const warningKey = getLocationWarningKey();
      if (acknowledgedLocationWarningKey !== warningKey) {
        setAcknowledgedLocationWarningKey(warningKey);
        return showToastInfoMsg('Please check this job description again. It may be hybrid-only or onsite-only. Click generate again to continue.');
      }
    }

    setWorking(true);

    try {
      const res = await fetch('/api/resume/create-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl, desc: jobDesc, profileId, userId: currentUser.id, companyName })
      });
      if (!res.ok) {
        let errJson;
        try {
          errJson = await res.json();
        } catch (_) {
          errJson = { msg: 'Failed to generate resume' };
        }
        throw new Error(errJson.msg || 'Failed to generate resume');
      }
      setCan(true);
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'resume.pdf';

      if (disposition?.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToastInfoMsg('Your resume is ready for download!');
    } catch (err) {
      console.error(err);
      showToastErrorMsg(err.message || 'Failed to generate resume.');
    }

    setWorking(false);
  };

  const generateCoverPDF = async () => {
    if (!jobUrl) return showToastErrorMsg('Please enter a valid Job URL');
    if (!profileId) return showToastErrorMsg('Please select a Profile');
    if (!jobDesc) return showToastErrorMsg('Please enter a Job Description');
    if (!companyName) return showToastErrorMsg('Please enter a Company Name!');
    if (!position) return showToastErrorMsg('Please enter the job title!');

    setCovering(true);

    try {
      const res = await fetch('/api/resume/create-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl, desc: jobDesc, profileId, companyName, position })
      });

      if (!res.ok) throw new Error('Failed to generate cover');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'cover.pdf';

      if (disposition?.includes('filename=')) {
        filename = disposition.split('filename=')[1].replace(/"/g, '');
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToastInfoMsg('Your cover is ready for download!');
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Failed to generate cover.');
    }
    setCompanyName('');
    setPosition('');
    setCovering(false);
  };

  const askApplicationQuestion = async (prefilledQuestion = '') => {
    const question = String(prefilledQuestion || chatQuestion).trim();

    if (!profileId) return showToastErrorMsg('Please select a Profile first.');
    if (!selectedProfile) return showToastErrorMsg('Selected profile details are unavailable.');
    if (!jobDesc) return showToastErrorMsg('Please enter a Job Description first.');
    if (!question) return showToastErrorMsg('Please enter a question.');

    const nextMessages = [...chatMessages, { role: 'user', content: question }];
    setChatMessages(nextMessages);
    setChatQuestion('');
    setAnswering(true);

    try {
      const res = await fetch('/api/resume/answer-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          jobDescription: jobDesc,
          companyName,
          position,
          profile: selectedProfile,
          chatHistory: chatMessages.slice(-8)
        })
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }

      if (!res.ok || data?.error) {
        throw new Error(data?.msg || 'Failed to answer question.');
      }

      setChatMessages((currentMessages) => [...currentMessages, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      console.error(err);
      showToastErrorMsg(err.message || 'Failed to answer question.');
      setChatMessages((currentMessages) => currentMessages.slice(0, -1));
    } finally {
      setAnswering(false);
    }
  };

  return (
    <ContentWrapper className='resume'>
      <div className='container'>
        <PageShell>
          <div style={{ display: 'flex', gap: 24, alignItems: 'stretch', flexWrap: 'wrap', paddingLeft: 20 }}>
            <SurfaceCard
              style={{
                flex: '1 1 760px',
                minWidth: 0,
                display: 'flex',
                height: 'calc(100vh - 48px)',
                maxHeight: 'calc(100vh - 48px)',
                overflow: 'hidden'
              }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 24, minHeight: 0 }}>
                <div style={{ display: 'flex', gap: 16, width: '100%', flexWrap: 'wrap' }}>
                  <Input
                    placeholder='Job URL'
                    size='middle'
                    value={jobUrl}
                    onChange={(e) => setUrl(e.target.value)}
                    style={{ flex: 1, minWidth: 260 }}
                  />

                  <Select
                    placeholder='Select Profile'
                    size='middle'
                    showSearch
                    optionFilterProp='label'
                    filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                    style={{ width: 260 }}
                    value={profileId ?? undefined}
                    onChange={(value) => {
                      setProfileId(value);
                      resetChat();
                    }}
                    options={profiles.map((p) => ({
                      label: p.profileName,
                      value: p._id
                    }))}
                  />
                  {can && (
                    <>
                      <Input
                        placeholder='Company Name'
                        size='middle'
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        style={{ flex: 1, minWidth: 220 }}
                      />
                      <Input
                        placeholder='Position'
                        size='middle'
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        style={{ flex: 1, minWidth: 220 }}
                      />
                    </>
                  )}
                </div>

                {selectedProfile && (
                  <div
                    style={{
                      border: '1px solid rgba(148, 163, 184, 0.16)',
                      borderRadius: 14,
                      background: 'rgba(20, 36, 54, 0.48)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap'
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(230, 238, 248, 0.52)', fontWeight: 700 }}>
                          Selected Profile
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#f4f7fb', marginTop: 4 }}>
                          {selectedProfile.profileName || 'Profile'}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 12
                      }}
                    >
                      {selectedProfileInfo.map((item) => (
                        <div
                          key={item.label}
                          style={{
                            border: '1px solid rgba(148, 163, 184, 0.14)',
                            borderRadius: 12,
                            padding: '12px 14px',
                            background: 'rgba(9, 16, 29, 0.42)',
                            minWidth: 0
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: 'rgba(230, 238, 248, 0.48)',
                              fontWeight: 700,
                              marginBottom: 6
                            }}
                          >
                            {item.label}
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              lineHeight: 1.5,
                              color: '#dce7f6',
                              wordBreak: 'break-word'
                            }}
                          >
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                  <TextArea
                    value={jobDesc}
                    onChange={(e) => {
                      setDesc(e.target.value);
                      setAcknowledgedLocationWarningKey('');
                    }}
                    style={{ width: '100%', height: '100%', resize: 'none' }}
                  />
                </div>
                <Space style={{ flexShrink: 0 }}>
                  <StyledButton
                    variant='primary'
                    size='large'
                    loading={isWorking}
                    disabled={isWorking}
                    onClick={generateResumePDF}
                    style={{ width: 220 }}
                  >
                    {isWorking ? 'Generating...' : 'Generate Resume'}
                  </StyledButton>
                  {can && (
                    <StyledButton
                      variant='secondary'
                      size='large'
                      loading={isCovering}
                      disabled={isCovering}
                      onClick={generateCoverPDF}
                      style={{ width: 220 }}
                    >
                      {isCovering ? 'Generating...' : 'Generate Cover'}
                    </StyledButton>
                  )}
                </Space>
              </div>
            </SurfaceCard>

            <SurfaceCard
              style={{
                flex: '0 1 380px',
                width: '100%',
                minWidth: 320,
                position: 'sticky',
                top: 24,
                alignSelf: 'stretch',
                display: 'flex',
                height: 'calc(100vh - 48px)',
                maxHeight: 'calc(100vh - 48px)',
                overflow: 'hidden'
              }}
            >
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
                <div
                  style={{
                    borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                    paddingBottom: 14
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      alignItems: 'center',
                      marginBottom: 10
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Application Q&A</div>
                    </div>
                    <StyledButton variant='ghost' size='small' onClick={resetChat} style={{ minWidth: 72 }}>
                      Clear
                    </StyledButton>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CHAT_STARTER_QUESTIONS.map((starter) => (
                    <button
                      key={starter}
                      type='button'
                      disabled={isAnswering}
                      onClick={() => askApplicationQuestion(starter)}
                      style={{
                        borderRadius: 12,
                        padding: '8px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#dce7f6',
                        background: 'rgba(20, 36, 54, 0.86)',
                        border: '1px solid rgba(148, 163, 184, 0.16)',
                        cursor: isAnswering ? 'not-allowed' : 'pointer',
                        opacity: isAnswering ? 0.6 : 1,
                        textAlign: 'left'
                      }}
                    >
                      {starter}
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    border: '1px solid rgba(148, 163, 184, 0.16)',
                    borderRadius: 12,
                    padding: 16,
                    height: chatMessages.length || isAnswering ? '100%' : 'auto',
                    background: 'rgba(9, 16, 29, 0.72)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.02)',
                    flex: chatMessages.length || isAnswering ? 1 : '0 0 auto',
                    minHeight: 0,
                    marginTop: 'auto'
                  }}
                >
                  {(chatMessages.length > 0 || isAnswering) && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        flex: 1,
                        minHeight: 0,
                        overflowY: 'auto',
                        paddingRight: 4
                      }}
                    >
                      {chatMessages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          style={{
                            alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                            maxWidth: '92%',
                            background:
                              message.role === 'user' ? 'rgba(25, 179, 138, 0.16)' : 'rgba(20, 36, 54, 0.92)',
                            border:
                              message.role === 'user'
                                ? '1px solid rgba(25, 179, 138, 0.28)'
                                : '1px solid rgba(148, 163, 184, 0.16)',
                            borderRadius: 12,
                            padding: '11px 13px'
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: 'rgba(230, 238, 248, 0.52)',
                              marginBottom: 6,
                              fontWeight: 700
                            }}
                          >
                            {message.role === 'user' ? 'You' : 'Assistant'}
                          </div>
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 12 }}>{message.content}</div>
                        </div>
                      ))}
                      {isAnswering && (
                        <div
                          style={{
                            alignSelf: 'flex-start',
                            maxWidth: '92%',
                            background: 'rgba(20, 36, 54, 0.92)',
                            border: '1px solid rgba(148, 163, 184, 0.16)',
                            borderRadius: 12,
                            padding: '11px 13px'
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: 'rgba(230, 238, 248, 0.52)',
                              marginBottom: 6,
                              fontWeight: 700
                            }}
                          >
                            Assistant
                          </div>
                          <div style={{ color: 'rgba(230, 238, 248, 0.68)', fontSize: 12 }}>Thinking about the best grounded answer...</div>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    style={{
                      borderTop: chatMessages.length || isAnswering ? '1px solid rgba(148, 163, 184, 0.16)' : 'none',
                      paddingTop: chatMessages.length || isAnswering ? 14 : 0,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      flexShrink: 0,
                      marginTop: 'auto'
                    }}
                  >
                    <TextArea
                      rows={4}
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                      placeholder='Paste an employer question here, for example: Why do you want this role?'
                    />

                    <div style={{ color: 'rgba(230, 238, 248, 0.52)', fontSize: 12, lineHeight: 1.5 }}>
                      {selectedProfile ? `Using profile: ${selectedProfile.profileName}` : 'Select a profile to start answering.'}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <StyledButton
                        variant='primary'
                        size='middle'
                        loading={isAnswering}
                        disabled={isAnswering}
                        onClick={() => askApplicationQuestion()}
                        style={{ minWidth: 140 }}
                      >
                        {isAnswering ? 'Answering...' : 'Get Answer'}
                      </StyledButton>
                    </div>
                  </div>
                </div>
              </div>
            </SurfaceCard>
          </div>
        </PageShell>
      </div>
    </ContentWrapper>
  );
}
