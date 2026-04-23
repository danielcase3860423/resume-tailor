'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button, Space, Input, Modal, DatePicker, Select, Tabs, Popconfirm } from 'antd';
import { DeleteOutlined, DownloadOutlined, EditOutlined, EyeTwoTone, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
import authHeader from '@/helpers/auth-header';
import { useGlobalContext } from '@/context/auth';
import resumeService from '@/services/(routes)/resume';
import profileService from '@/services/(routes)/profiles';
import userService from '@/services/(routes)/users';
import { CONSTANT_USER_ROLE_ADMIN } from '@/config/constants';
import {
  FlexBox,
  StyledButton,
  ColorTable,
  PageShell,
  SectionStack,
  DashboardPageHeader,
  DashboardPageIntro,
  DashboardMetaChip,
  DashboardMetaRow,
  DashboardStatGrid,
  DashboardStatCard,
  DashboardTableSection,
  DashboardSectionHeader,
  PageToolbar,
  ToolbarGroup
} from '@/_components/layout/client/styled';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Option } = Select;
const INITIAL_PAGE_SIZE = 50;

const createEmptyWorkExperience = () => ({
  job_title: '',
  company_name: '',
  start_date_employment: '',
  end_date_employment: '',
  achievementsText: ''
});

function buildEditorState(resume) {
  const response = resume?.resumeResponse || {};
  const summary = Array.isArray(response.summary) && response.summary.length ? response.summary : [''];
  const technicalSkillEntries = Object.entries(response.technical_skills || {}).length
    ? Object.entries(response.technical_skills || {}).map(([category, skills]) => ({
        category,
        skillsText: Array.isArray(skills) ? skills.join(', ') : ''
      }))
    : [{ category: '', skillsText: '' }];
  const workExperienceEntries = Array.isArray(response.work_experiences) && response.work_experiences.length
    ? response.work_experiences.map((experience) => ({
        job_title: experience?.job_title || '',
        company_name: experience?.company_name || '',
        start_date_employment: experience?.start_date_employment || '',
        end_date_employment: experience?.end_date_employment || '',
        achievementsText: Array.isArray(experience?.achievements) ? experience.achievements.join('\n') : ''
      }))
    : [createEmptyWorkExperience()];

  return {
    summary,
    technicalSkillEntries,
    workExperienceEntries,
    target_company_name: response.target_company_name || resume?.companyName || '',
    target_position: response.target_position || resume?.jobTitle || '',
    jobDescription: resume?.jobDescription || ''
  };
}

function buildResumeResponsePayload(editorState) {
  return {
    summary: (editorState.summary || []).map((item) => item.trim()).filter(Boolean),
    technical_skills: (editorState.technicalSkillEntries || []).reduce((accumulator, entry) => {
      const category = (entry.category || '').trim();
      const skills = (entry.skillsText || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      if (category && skills.length) {
        accumulator[category] = skills;
      }

      return accumulator;
    }, {}),
    work_experiences: (editorState.workExperienceEntries || [])
      .map((experience) => ({
        job_title: (experience.job_title || '').trim(),
        company_name: (experience.company_name || '').trim(),
        start_date_employment: (experience.start_date_employment || '').trim(),
        end_date_employment: (experience.end_date_employment || '').trim(),
        achievements: (experience.achievementsText || '')
          .split('\n')
          .map((item) => item.replace(/^[\s*-]+/, '').trim())
          .filter(Boolean)
      }))
      .filter(
        (experience) =>
          experience.job_title ||
          experience.company_name ||
          experience.start_date_employment ||
          experience.end_date_employment ||
          experience.achievements.length
      ),
    target_company_name: (editorState.target_company_name || '').trim(),
    target_position: (editorState.target_position || '').trim()
  };
}

export default function Applies() {
  const { loginUser } = useGlobalContext();
  const currentUser = loginUser?.user;
  const isAdmin = currentUser?.role === CONSTANT_USER_ROLE_ADMIN;
  const [profileData, setProfiles] = useState([]);
  const [userData, setUsers] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [curResume, setResume] = useState();
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: INITIAL_PAGE_SIZE, total: 0 });
  const [sortInfo, setSortInfo] = useState({ field: 'created_at', order: 'descend' });
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  // Individual filter states
  const [dateFilter, setDateFilter] = useState(null);
  const [companyFilter, setCompanyFilter] = useState('');
  const [profileFilter, setProfileFilter] = useState('');
  const [vaFilter, setVaFilter] = useState('');
  const [desFilter, setDesFilter] = useState('');
  const [debouncedDesFilter, setDebouncedDesFilter] = useState('');
  const [editingResume, setEditingResume] = useState(null);
  const [editorState, setEditorState] = useState(() => buildEditorState());
  const [editTab, setEditTab] = useState('summary');
  const [savingEdit, setSavingEdit] = useState(false);
  const [loadingResumeDetails, setLoadingResumeDetails] = useState(false);

  const profileNameById = useMemo(
    () =>
      profileData.reduce((accumulator, profile) => {
        accumulator[profile._id] = profile.profileName;
        return accumulator;
      }, {}),
    [profileData]
  );

  const userNameById = useMemo(
    () =>
      userData.reduce((accumulator, user) => {
        accumulator[user._id] = user.username;
        return accumulator;
      }, {}),
    [userData]
  );

  const selectedProfileName = useMemo(() => {
    if (!profileFilter) {
      return '';
    }

    return profileData.find((profile) => profile._id === profileFilter)?.profileName || '';
  }, [profileData, profileFilter]);

  const handleDownload = async (record) => {
    try {
      const res = await fetch('/api/resume/download-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: record.associatedProfileId, resumeId: record._id })
      });
      if (!res.ok) {
        let errJson;
        try {
          errJson = await res.json();
        } catch (_) {
          errJson = { msg: 'Failed to download resume' };
        }
        throw new Error(errJson.msg || 'Failed to download resume');
      }

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
      showToastErrorMsg(err.message || 'Failed to download resume.');
    }
  };

  const fetchResumeDetails = useCallback(async (resumeId) => {
    const res = await fetch('/api/resume/get-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId, userId: currentUser?.id })
    });

    if (!res.ok) {
      let errJson;
      try {
        errJson = await res.json();
      } catch (_) {
        errJson = { msg: 'Failed to load resume details' };
      }
      throw new Error(errJson.msg || 'Failed to load resume details');
    }

    const data = await res.json();
    return data.resume;
  }, [currentUser?.id]);

  const handleOpenResumeDetails = useCallback(async (record, mode) => {
    setLoadingResumeDetails(true);

    try {
      const fullResume = await fetchResumeDetails(record._id);
      setResumes((prev) => prev.map((item) => (item._id === fullResume._id ? { ...item, ...fullResume } : item)));

      if (mode === 'view') {
        setResume(fullResume);
        setModalOpen(true);
        return;
      }

      setEditingResume(fullResume);
      setEditorState(buildEditorState(fullResume));
      setEditTab('summary');
      setEditModalOpen(true);
    } catch (err) {
      console.error(err);
      showToastErrorMsg(err.message || 'Failed to load resume details.');
    } finally {
      setLoadingResumeDetails(false);
    }
  }, [fetchResumeDetails]);

  const handleView = useCallback((record) => {
    handleOpenResumeDetails(record, 'view');
  }, [handleOpenResumeDetails]);

  const handleEdit = useCallback((record) => {
    handleOpenResumeDetails(record, 'edit');
  }, [handleOpenResumeDetails]);

  const handleDeleteResume = useCallback(
    async (record) => {
      try {
        const res = await fetch(`/api/resume/${record._id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader()
          },
          body: JSON.stringify({
            storageClusterKey: record.storageClusterKey || ''
          })
        });

        if (!res.ok) {
          let errJson;
          try {
            errJson = await res.json();
          } catch (_) {
            errJson = { msg: 'Failed to delete applied history' };
          }
          throw new Error(errJson.msg || 'Failed to delete applied history');
        }

        setResumes((prev) => prev.filter((item) => item._id !== record._id));
        setTotal((prev) => Math.max(0, prev - 1));
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));

        if (curResume?._id === record._id) {
          setModalOpen(false);
          setResume(undefined);
        }

        if (editingResume?._id === record._id) {
          closeEditModal();
        }

        showToastInfoMsg('Applied history removed successfully.');
      } catch (err) {
        console.error(err);
        showToastErrorMsg(err.message || 'Failed to delete applied history.');
      }
    },
    [curResume?._id, editingResume?._id]
  );

  const TABLE_COLUMNS = useMemo(
    () => [
      {
        title: 'DATE',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (createdAt) => dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss'),
        sorter: true,
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <div style={{ padding: 8 }}>
            <RangePicker
              value={selectedKeys[0]}
              onChange={(dates) => setSelectedKeys(dates ? [dates] : [])}
              style={{ marginBottom: 8, display: 'block' }}
            />
            <Space>
              <Button
                type='primary'
                size='small'
                onClick={() => {
                  if (selectedKeys[0]) {
                    const [start, end] = selectedKeys[0];
                    setDateFilter({
                      start: start.startOf('day').toISOString(),
                      end: end.endOf('day').toISOString()
                    });
                  }
                  confirm();
                }}
              >
                Filter
              </Button>
              <Button
                size='small'
                onClick={() => {
                  clearFilters();
                  setDateFilter(null);
                  confirm();
                }}
              >
                Clear
              </Button>
            </Space>
          </div>
        ),
        onFilter: () => true
      },
      {
        title: 'COMPANY NAME',
        dataIndex: 'companyName',
        key: 'companyName',
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <Space direction='vertical' style={{ padding: 8 }}>
            <Input
              value={selectedKeys[0]}
              onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
              onPressEnter={() => confirm()}
              placeholder='Search company'
              style={{ width: 188, display: 'block' }}
            />
            <Space>
              <Button
                size='small'
                onClick={() => {
                  clearFilters();
                  setCompanyFilter('');
                  confirm();
                }}
              >
                Clear
              </Button>
              <Button
                type='primary'
                size='small'
                onClick={() => {
                  setCompanyFilter(selectedKeys[0] || '');
                  confirm();
                }}
              >
                Search
              </Button>
            </Space>
          </Space>
        ),
        onFilter: () => true
      },
      {
        title: 'POSITION',
        dataIndex: 'jobTitle',
        key: 'jobTitle',
        render: (jobTitle, record) => (
          <Space size='small'>
            <span>{jobTitle || 'N/A'}</span>
            <Button type='text' icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          </Space>
        )
      },
      {
        title: 'PROFILE',
        dataIndex: 'associatedProfileId',
        key: 'associatedProfileId',
        render: (profileId) => profileNameById[profileId] || 'N/A',
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <Space direction='vertical' style={{ padding: 8 }}>
            <Select
              allowClear
              value={selectedKeys[0]}
              onChange={(value) => setSelectedKeys(value ? [value] : [])}
              placeholder='Select Profile'
              style={{ width: 200 }}
            >
              {profileData.map((p) => (
                <Option key={p._id} value={p._id}>
                  {p.profileName}
                </Option>
              ))}
            </Select>
            <Space>
              <Button
                size='small'
                onClick={() => {
                  clearFilters();
                  setProfileFilter('');
                  confirm();
                }}
              >
                Clear
              </Button>
              <Button
                type='primary'
                size='small'
                onClick={() => {
                  setProfileFilter(selectedKeys[0] || '');
                  confirm();
                }}
              >
                Search
              </Button>
            </Space>
          </Space>
        ),
        onFilter: () => true
      },
      {
        title: 'APPLIED VA',
        dataIndex: 'associatedUserId',
        key: 'associatedUserId',
        render: (userId) => userNameById[userId] || 'N/A',
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
          <Space direction='vertical' style={{ padding: 8 }}>
            <Select
              allowClear
              value={selectedKeys[0]}
              onChange={(value) => setSelectedKeys(value ? [value] : [])}
              placeholder='Select VA'
              style={{ width: 200 }}
            >
              {userData.map((user) => (
                <Option key={user._id} value={user._id}>
                  {user.username}
                </Option>
              ))}
            </Select>
            <Space>
              <Button
                size='small'
                onClick={() => {
                  clearFilters();
                  setVaFilter('');
                  confirm();
                }}
              >
                Clear
              </Button>
              <Button
                type='primary'
                size='small'
                onClick={() => {
                  setVaFilter(selectedKeys[0] || '');
                  confirm();
                }}
              >
                Search
              </Button>
            </Space>
          </Space>
        ),
        onFilter: () => true
      },
      {
        title: 'ACTIONS',
        key: 'actions',
        align: 'center',
        render: (_, record) => (
          <Space size='middle'>
            <Button type='text' icon={<EyeTwoTone />} onClick={() => handleView(record)} disabled={loadingResumeDetails} />
            <Button type='text' icon={<EditOutlined />} onClick={() => handleEdit(record)} disabled={loadingResumeDetails} />
            <StyledButton onClick={() => handleDownload(record)} type='primary'>
              <DownloadOutlined />
            </StyledButton>
            {isAdmin ? (
              <Popconfirm
                title='Remove applied history?'
                description='This will permanently delete the stored resume record.'
                okText='Remove'
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDeleteResume(record)}
              >
                <Button danger type='text' icon={<DeleteOutlined />} />
              </Popconfirm>
            ) : null}
          </Space>
        )
      }
    ],
    [handleDeleteResume, handleEdit, handleView, isAdmin, loadingResumeDetails, profileData, profileNameById, userData, userNameById]
  );

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingResume(null);
    setEditorState(buildEditorState());
    setEditTab('summary');
  };

  const handleSaveEditedResume = async ({ downloadAfterSave = false } = {}) => {
    if (!editingResume) {
      return;
    }

    const resumeResponse = buildResumeResponsePayload(editorState);
    if (!resumeResponse.summary.length) {
      return showToastErrorMsg('Please add at least one summary line.');
    }

    setSavingEdit(true);

    try {
      const res = await fetch('/api/resume/update-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: editingResume._id,
          storageClusterKey: editingResume.storageClusterKey,
          resumeResponse,
          jobDescription: editorState.jobDescription,
          companyName: editorState.target_company_name,
          jobTitle: editorState.target_position,
          userId: currentUser?.id
        })
      });

      if (!res.ok) {
        let errJson;
        try {
          errJson = await res.json();
        } catch (_) {
          errJson = { msg: 'Failed to update resume' };
        }
        throw new Error(errJson.msg || 'Failed to update resume');
      }

      const data = await res.json();
      const updatedResume = data.resume;

      setResumes((prev) => prev.map((item) => (item._id === updatedResume._id ? updatedResume : item)));
      if (curResume?._id === updatedResume._id) {
        setResume(updatedResume);
      }

      showToastInfoMsg('Resume updated successfully.');

      if (downloadAfterSave) {
        await handleDownload(updatedResume);
      }

      closeEditModal();
    } catch (err) {
      console.error(err);
      showToastErrorMsg(err.message || 'Failed to update resume.');
    } finally {
      setSavingEdit(false);
    }
  };

  const fetchResumes = useCallback(async (currentPage, nextSortInfo = {}, options = {}) => {
    const { append = false } = options;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await resumeService.getResumes({
        currentPage,
        limit: pagination.pageSize,
        sortBy: nextSortInfo.field || 'created_at',
        sortOrder: nextSortInfo.order || 'descend',
        startDate: dateFilter?.start || '',
        endDate: dateFilter?.end || '',
        companyName: companyFilter || '',
        profileId: profileFilter || '',
        profileName: selectedProfileName || '',
        description: debouncedDesFilter || '',
        associatedUserId: vaFilter || ''
      });

      const nextResumes = data.resumes || [];
      setResumes((prev) => (append ? [...prev, ...nextResumes] : nextResumes));
      setTotal(data.total || 0);
      setHasMore(Boolean(data.hasMore));
      setPagination((prev) => ({ ...prev, current: currentPage, total: data.total || 0 }));
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Failed to load resumes');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [pagination.pageSize, dateFilter, companyFilter, profileFilter, selectedProfileName, debouncedDesFilter, vaFilter]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, current: 1, pageSize: INITIAL_PAGE_SIZE, total: 0 }));
    fetchResumes(1, sortInfo, { append: false });
  }, [sortInfo, dateFilter, companyFilter, profileFilter, debouncedDesFilter, vaFilter, fetchResumes]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedDesFilter(desFilter);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeout);
  }, [desFilter]);

  const fetchProfiles = async () => {
    try {
      const data = await profileService.getProfiles();
      if (!data.error) setProfiles(data.profiles || []);
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Failed to load profiles.');
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await userService.getUsers();
      if (!data?.error) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Failed to load users.');
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchUsers();
  }, []);

  const handleTableChange = (_, filters, sorter) => {
    if (sorter.field && sorter.order) {
      setSortInfo({ field: sorter.field, order: sorter.order });
      return;
    }

    if (!sorter.order) {
      setSortInfo({ field: 'created_at', order: 'descend' });
    }
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) {
      return;
    }

    const nextPage = pagination.current + 1;
    fetchResumes(nextPage, sortInfo, { append: true });
  };

  return (
    <PageShell>
      <SectionStack>
        <DashboardPageHeader>
          <DashboardPageIntro>
            <h1>Applied History</h1>
            <p>Review generated resumes, inspect job descriptions, and keep application history in the same dark dashboard workspace.</p>
          </DashboardPageIntro>
          <DashboardMetaRow>
            <DashboardMetaChip>{total} total applies</DashboardMetaChip>
            <DashboardMetaChip>{resumes.length} loaded</DashboardMetaChip>
            <DashboardMetaChip>{hasMore ? 'More available' : 'Fully loaded'}</DashboardMetaChip>
          </DashboardMetaRow>
        </DashboardPageHeader>

        <DashboardStatGrid>
          <DashboardStatCard>
            <strong>Total applies</strong>
            <b>{total}</b>
            <span>Resume applications matching the current filters</span>
          </DashboardStatCard>
          <DashboardStatCard>
            <strong>Loaded records</strong>
            <b>{resumes.length}</b>
            <span>Rows currently rendered in the table</span>
          </DashboardStatCard>
          <DashboardStatCard>
            <strong>Profiles</strong>
            <b>{profileData.length}</b>
            <span>Profiles available for filtering applied history</span>
          </DashboardStatCard>
          <DashboardStatCard>
            <strong>Assistants</strong>
            <b>{userData.length}</b>
            <span>Workspace users available in the applied-by filter</span>
          </DashboardStatCard>
        </DashboardStatGrid>

        <DashboardTableSection>
          <DashboardSectionHeader>
            <div>
              <strong>Application records</strong>
              <span>Filter, sort, preview, and download resume history using the same board-like data view as the dashboard.</span>
            </div>
          </DashboardSectionHeader>
          <PageToolbar>
            <ToolbarGroup>
              <Input
                placeholder='Search by description...'
                value={desFilter}
                onChange={(e) => setDesFilter(e.target.value)}
                style={{ width: 280 }}
              />
            </ToolbarGroup>
            <ToolbarGroup>
              <DashboardMetaChip>{loading ? 'Loading' : `${resumes.length} visible rows`}</DashboardMetaChip>
            </ToolbarGroup>
          </PageToolbar>

          <ColorTable
            columns={TABLE_COLUMNS}
            dataSource={resumes}
            rowKey='_id'
            pagination={false}
            loading={loading}
            onChange={handleTableChange}
            style={{ margin: '24px 0' }}
          />
          {hasMore ? (
            <FlexBox style={{ justifyContent: 'center', marginBottom: 4 }}>
              <StyledButton type='primary' onClick={handleLoadMore} loading={loadingMore}>
                Load 50 More
              </StyledButton>
            </FlexBox>
          ) : null}
        </DashboardTableSection>
        <Modal title='Job Description' open={isModalOpen} onCancel={() => setModalOpen(false)}>
          <Space direction='vertical' style={{ width: '100%' }}>
            <p style={{ margin: 0 }}>{curResume?.jobLink}</p>
            <TextArea rows={30} value={curResume?.jobDescription} readOnly style={{ resize: 'none' }} />
          </Space>
        </Modal>
        <Modal
          title='Edit Resume'
          open={isEditModalOpen}
          onCancel={closeEditModal}
          width={1200}
          destroyOnClose={false}
          footer={[
            <Button key='cancel' onClick={closeEditModal}>
              Cancel
            </Button>,
            <Button key='save' type='default' loading={savingEdit} onClick={() => handleSaveEditedResume()}>
              Save Changes
            </Button>,
            <Button key='save-download' type='primary' loading={savingEdit} onClick={() => handleSaveEditedResume({ downloadAfterSave: true })}>
              Save & Download
            </Button>
          ]}
        >
          <Tabs
            activeKey={editTab}
            onChange={setEditTab}
            items={[
              {
                key: 'summary',
                label: 'Summary',
                children: (
                  <Space direction='vertical' size='large' style={{ width: '100%' }}>
                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 12 }}>Summary</div>
                      <Space direction='vertical' style={{ width: '100%' }}>
                        {editorState.summary.map((line, index) => (
                          <div key={`summary-${index}`} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <TextArea
                              autoSize={{ minRows: 2, maxRows: 4 }}
                              value={line}
                              onChange={(event) =>
                                setEditorState((prev) => ({
                                  ...prev,
                                  summary: prev.summary.map((item, itemIndex) => (itemIndex === index ? event.target.value : item))
                                }))
                              }
                            />
                            <Button
                              danger
                              icon={<DeleteOutlined />}
                              onClick={() =>
                                setEditorState((prev) => ({
                                  ...prev,
                                  summary: prev.summary.length === 1 ? [''] : prev.summary.filter((_, itemIndex) => itemIndex !== index)
                                }))
                              }
                            />
                          </div>
                        ))}
                        <Button
                          icon={<PlusOutlined />}
                          onClick={() =>
                            setEditorState((prev) => ({
                              ...prev,
                              summary: [...prev.summary, '']
                            }))
                          }
                        >
                          Add Summary Line
                        </Button>
                      </Space>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, marginBottom: 12 }}>Job Description</div>
                      <TextArea
                        rows={10}
                        value={editorState.jobDescription}
                        onChange={(event) =>
                          setEditorState((prev) => ({
                            ...prev,
                            jobDescription: event.target.value
                          }))
                        }
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Target Company</div>
                        <Input
                          value={editorState.target_company_name}
                          onChange={(event) =>
                            setEditorState((prev) => ({
                              ...prev,
                              target_company_name: event.target.value
                            }))
                          }
                        />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, marginBottom: 8 }}>Target Position</div>
                        <Input
                          value={editorState.target_position}
                          onChange={(event) =>
                            setEditorState((prev) => ({
                              ...prev,
                              target_position: event.target.value
                            }))
                          }
                        />
                      </div>
                    </div>
                  </Space>
                )
              },
              {
                key: 'technical-skills',
                label: 'Technical Skills',
                children: (
                  <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                    {editorState.technicalSkillEntries.map((entry, index) => (
                      <div
                        key={`skill-${index}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '240px minmax(0, 1fr) 40px',
                          gap: 12,
                          alignItems: 'start'
                        }}
                      >
                        <Input
                          placeholder='Category'
                          value={entry.category}
                          onChange={(event) =>
                            setEditorState((prev) => ({
                              ...prev,
                              technicalSkillEntries: prev.technicalSkillEntries.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, category: event.target.value } : item
                              )
                            }))
                          }
                        />
                        <Input
                          placeholder='Comma-separated skills'
                          value={entry.skillsText}
                          onChange={(event) =>
                            setEditorState((prev) => ({
                              ...prev,
                              technicalSkillEntries: prev.technicalSkillEntries.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, skillsText: event.target.value } : item
                              )
                            }))
                          }
                        />
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() =>
                            setEditorState((prev) => ({
                              ...prev,
                              technicalSkillEntries:
                                prev.technicalSkillEntries.length === 1
                                  ? [{ category: '', skillsText: '' }]
                                  : prev.technicalSkillEntries.filter((_, itemIndex) => itemIndex !== index)
                            }))
                          }
                        />
                      </div>
                    ))}
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() =>
                        setEditorState((prev) => ({
                          ...prev,
                          technicalSkillEntries: [...prev.technicalSkillEntries, { category: '', skillsText: '' }]
                        }))
                      }
                    >
                      Add Skill Category
                    </Button>
                  </Space>
                )
              },
              {
                key: 'work-experiences',
                label: 'Work Experiences',
                children: (
                  <Space direction='vertical' size='middle' style={{ width: '100%' }}>
                    {editorState.workExperienceEntries.map((experience, index) => (
                      <div
                        key={`work-${index}`}
                        style={{
                          border: '1px solid rgba(148, 163, 184, 0.16)',
                          borderRadius: 12,
                          padding: 16,
                          display: 'grid',
                          gap: 12
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                          <strong>Work Experience {index + 1}</strong>
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() =>
                              setEditorState((prev) => ({
                                ...prev,
                                workExperienceEntries:
                                  prev.workExperienceEntries.length === 1
                                    ? [createEmptyWorkExperience()]
                                    : prev.workExperienceEntries.filter((_, itemIndex) => itemIndex !== index)
                              }))
                            }
                          />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                          <Input
                            placeholder='Job Title'
                            value={experience.job_title}
                            onChange={(event) =>
                              setEditorState((prev) => ({
                                ...prev,
                                workExperienceEntries: prev.workExperienceEntries.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, job_title: event.target.value } : item
                                )
                              }))
                            }
                          />
                          <Input
                            placeholder='Company Name'
                            value={experience.company_name}
                            onChange={(event) =>
                              setEditorState((prev) => ({
                                ...prev,
                                workExperienceEntries: prev.workExperienceEntries.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, company_name: event.target.value } : item
                                )
                              }))
                            }
                          />
                          <Input
                            placeholder='Start Date'
                            value={experience.start_date_employment}
                            onChange={(event) =>
                              setEditorState((prev) => ({
                                ...prev,
                                workExperienceEntries: prev.workExperienceEntries.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, start_date_employment: event.target.value } : item
                                )
                              }))
                            }
                          />
                          <Input
                            placeholder='End Date'
                            value={experience.end_date_employment}
                            onChange={(event) =>
                              setEditorState((prev) => ({
                                ...prev,
                                workExperienceEntries: prev.workExperienceEntries.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, end_date_employment: event.target.value } : item
                                )
                              }))
                            }
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, marginBottom: 8 }}>Achievements</div>
                          <TextArea
                            rows={6}
                            placeholder='One bullet per line'
                            value={experience.achievementsText}
                            onChange={(event) =>
                              setEditorState((prev) => ({
                                ...prev,
                                workExperienceEntries: prev.workExperienceEntries.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, achievementsText: event.target.value } : item
                                )
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                    <Button
                      icon={<PlusOutlined />}
                      onClick={() =>
                        setEditorState((prev) => ({
                          ...prev,
                          workExperienceEntries: [...prev.workExperienceEntries, createEmptyWorkExperience()]
                        }))
                      }
                    >
                      Add Work Experience
                    </Button>
                  </Space>
                )
              }
            ]}
          />
        </Modal>
      </SectionStack>
    </PageShell>
  );
}
