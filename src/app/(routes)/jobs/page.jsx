'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Spin, Space, Typography, Tag, message, Popconfirm, Flex } from 'antd';
import { DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import { showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
import { DEFAULT_PAGINATION_SIZE, ERROR_FAILED, ERROR_SUCCESS } from '@/config/constants';
import {
  ColorTable,
  SpinWrapper,
  StyledButton,
  PageShell,
  SurfaceCard,
  PageToolbar,
  ToolbarGroup
} from '@/_components/layout/client/styled';
import jobsService from '@/services/(routes)/jobs';

const { Text } = Typography;
const DEFAULT_JOB_SYNC_KEYWORDS = 'Senior Software Engineer Remote USA';
const JOB_TAG_STYLES = {
  remote: {
    background: 'rgba(24, 119, 242, 0.16)',
    borderColor: 'rgba(98, 176, 255, 0.28)',
    color: '#9fd0ff'
  },
  salary: {
    background: 'rgba(25, 179, 138, 0.16)',
    borderColor: 'rgba(83, 222, 175, 0.28)',
    color: '#9bf0cf'
  },
  type: {
    background: 'rgba(255, 196, 90, 0.12)',
    borderColor: 'rgba(255, 196, 90, 0.24)',
    color: '#ffd98f'
  },
  benefit: {
    background: 'rgba(167, 139, 250, 0.16)',
    borderColor: 'rgba(196, 181, 253, 0.26)',
    color: '#d8cbff'
  }
};

export default function JobsList() {
  const [isLoading, setLoading] = useState(false);
  const [isSyncing, setSyncing] = useState(false);
  const [keywords, setKeywords] = useState('');
  const [hasAutoSynced, setHasAutoSynced] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [companyFilter, setCompanyFilter] = useState('');
  const [titleFilter, setTitleFilter] = useState('');
  const [extFilter, setExtFilter] = useState('');
  const [debouncedExtFilter, setDebouncedExtFilter] = useState('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGINATION_SIZE,
    total: 0
  });
  const currentPage = pagination.current;
  const currentPageSize = pagination.pageSize;

  const fetchJobs = useCallback(async (page, pageSize = currentPageSize) => {
    try {
      setLoading(true);
      const data = await jobsService.getJobs({
        currentPage: page,
        limit: pageSize,
        company: companyFilter || '',
        title: titleFilter || '',
        extension: debouncedExtFilter || ''
      });
      if (!data.error) {
        setJobs(data.jobs || []);
        setTotal(data.total);
      }
      setPagination((prev) => ({ ...prev, current: page, pageSize, total: data.total || 0 }));
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Failed to load jobs.');
    } finally {
      setLoading(false);
    }
  }, [companyFilter, currentPageSize, debouncedExtFilter, titleFilter]);

  const onSyncJobs = useCallback(async ({ silent = false, forceKeywords = '' } = {}) => {
    try {
      setSyncing(true);
      const effectiveKeywords = String(forceKeywords || keywords || '').trim() || DEFAULT_JOB_SYNC_KEYWORDS;
      const { result, msg } = await jobsService.syncJobs(effectiveKeywords);

      if (result === ERROR_SUCCESS) {
        if (!silent) {
          showToastInfoMsg(msg);
        }
      } else if (result === ERROR_FAILED) {
        showToastErrorMsg(msg);
      }
      setKeywords('');
      await fetchJobs(1);
    } catch (err) {
      if (!silent) {
        showToastErrorMsg('Failed to sync jobs.');
      }
    } finally {
      setSyncing(false);
    }
  }, [fetchJobs, keywords]);

  useEffect(() => {
    fetchJobs(currentPage);
  }, [currentPage, fetchJobs]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedExtFilter(extFilter);
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeout);
  }, [extFilter]);

  useEffect(() => {
    if (isLoading || isSyncing || hasAutoSynced || total > 0) {
      return;
    }

    setHasAutoSynced(true);
    onSyncJobs({ silent: true, forceKeywords: DEFAULT_JOB_SYNC_KEYWORDS });
  }, [hasAutoSynced, isLoading, isSyncing, onSyncJobs, total]);

  const parseTags = (ext) => {
    if (!ext) return [];

    const tags = [];
    const salaryMatch = ext.match(/\d+k/i);

    if (/remote/i.test(ext)) tags.push({ label: 'Remote', style: JOB_TAG_STYLES.remote });
    if (salaryMatch) tags.push({ label: salaryMatch[0] + ' Salary', style: JOB_TAG_STYLES.salary });
    if (ext.includes('Full-time')) tags.push({ label: 'Full-time', style: JOB_TAG_STYLES.type });
    if (ext.includes('Part-time')) tags.push({ label: 'Part-time', style: JOB_TAG_STYLES.type });
    if (ext.includes('Health Insurance')) tags.push({ label: 'Health Insurance', style: JOB_TAG_STYLES.benefit });
    if (ext.includes('Dental')) tags.push({ label: 'Dental', style: JOB_TAG_STYLES.benefit });

    return tags.map((t, i) => (
      <Tag
        key={i}
        style={{
          marginInlineEnd: 6,
          marginBottom: 6,
          borderRadius: 999,
          fontSize: 11,
          padding: '2px 9px',
          ...t.style
        }}
      >
        {t.label}
      </Tag>
    ));
  };

  const formatPostedLabel = (job) => {
    if (job?.posted_at) {
      const postedAt = new Date(job.posted_at);
      if (!Number.isNaN(postedAt.getTime())) {
        const diffDays = Math.max(0, Math.floor((Date.now() - postedAt.getTime()) / 86400000));
        if (diffDays === 0) {
          return 'Today';
        }
        if (diffDays === 1) {
          return '1 day ago';
        }
        return `${diffDays} days ago`;
      }
    }

    return String(job?.extensions || '').split(',')[0] || 'N/A';
  };

  const TABLE_COLUMNS = [
    {
      title: 'Referral Code',
      dataIndex: '_id',
      render: (id) => `Ref_0x${id.slice(-8).toUpperCase()}`
    },
    {
      title: 'Company',
      dataIndex: 'company_name',
      key: 'company_name',
      filteredValue: companyFilter ? [companyFilter] : null,
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
      onFilter: () => true,
      render: (name) => <Text style={{ fontSize: 16, color: '#f4f7fb' }}>{name}</Text>
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      filteredValue: titleFilter ? [titleFilter] : null,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
        <Space direction='vertical' style={{ padding: 8 }}>
          <Input
            value={selectedKeys[0]}
            onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            placeholder='Search Title'
            style={{ width: 188, display: 'block' }}
          />
          <Space>
            <Button
              size='small'
              onClick={() => {
                clearFilters();
                setTitleFilter('');
                confirm();
              }}
            >
              Clear
            </Button>
            <Button
              type='primary'
              size='small'
              onClick={() => {
                setTitleFilter(selectedKeys[0] || '');
                confirm();
              }}
            >
              Search
            </Button>
          </Space>
        </Space>
      ),
      onFilter: () => true,
      render: (_, job) => (
        <div>
          <strong style={{ color: '#eef4fb', fontSize: 15, lineHeight: 1.45 }}>{job.title}</strong>
          <div style={{ marginTop: 4, color: '#8fa2bb', fontSize: 12 }}>
            {[job.location, job.source_type ? job.source_type.toUpperCase() : ''].filter(Boolean).join(' · ')}
          </div>
          <div style={{ marginTop: 4 }}>{parseTags(job.extensions)}</div>
        </div>
      )
    },
    {
      title: 'Posted',
      key: 'posted_at',
      render: (_, job) => <span style={{ color: '#dbe7f3' }}>{formatPostedLabel(job)}</span>
    },
    {
      title: 'Apply URL',
      key: 'apply_url',
      render: (_, job) => {
        const firstApplyOption = Array.isArray(job.apply_options) ? job.apply_options.find((option) => option?.link) : null;
        if (!firstApplyOption?.link) {
          return <Text style={{ color: 'rgba(230, 238, 248, 0.56)' }}>N/A</Text>;
        }

        return (
          <a
            href={firstApplyOption.link}
            target='_blank'
            rel='noreferrer'
            style={{
              color: '#9fd0ff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <LinkOutlined />
            Open job
          </a>
        );
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title='Delete this job?'
          okText='Yes'
          cancelText='No'
          onConfirm={() => handleDelete(record._id)}
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            danger
            size='middle'
            icon={<DeleteOutlined style={{ color: 'red' }} />}
            style={{
              borderColor: 'rgba(255, 107, 107, 0.6)',
              background: 'rgba(120, 20, 20, 0.12)'
            }}
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      )
    }
  ];

  const handleDelete = async (id) => {
    try {
      await jobsService.deleteJob(id);
      showToastInfoMsg('Job is deleted.');
      fetchJobs(currentPage, currentPageSize);
    } catch (err) {
      showToastErrorMsg('Failed to delete job.');
    }
  };

  return (
    <div className='container'>
      <PageShell>
        <SurfaceCard>
          <PageToolbar>
            <ToolbarGroup style={{ flex: 1, flexWrap: 'nowrap', minWidth: 0 }}>
              <h5 style={{ margin: 0, color: '#f4f7fb', fontSize: 18, whiteSpace: 'nowrap', flexShrink: 0 }}>Total Jobs: {total}</h5>
              <Input
                size='middle'
                value={keywords}
                disabled={isSyncing}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder={DEFAULT_JOB_SYNC_KEYWORDS}
                style={{ flex: 1, minWidth: 260 }}
              />
            </ToolbarGroup>
            <ToolbarGroup style={{ flexWrap: 'nowrap' }}>
              <Input
                placeholder='Search by extension (5 days ago)...'
                value={extFilter}
                onChange={(e) => setExtFilter(e.target.value)}
                style={{ width: 280, flexShrink: 0 }}
              />
              <StyledButton size='middle' type='primary' onClick={onSyncJobs} loading={isSyncing}>
                {isSyncing ? 'UPDATING...' : 'FETCH JOBS'}
              </StyledButton>
            </ToolbarGroup>
          </PageToolbar>

          {isLoading ? (
            <SpinWrapper>
              <Spin size='large' delay={300} />
            </SpinWrapper>
          ) : (
            <Space direction='vertical' style={{ width: '100%' }}>
              <Flex justify='space-between'>
                <h5 style={{ margin: 0, color: '#dbe7f3', fontSize: 16, fontWeight: 600 }}>Latest jobs first</h5>
              </Flex>
              <ColorTable
                columns={TABLE_COLUMNS}
                dataSource={jobs}
                rowKey='_id'
                onRow={() => ({
                  style: { cursor: 'pointer' }
                })}
                expandable={{
                  expandRowByClick: true,
                  showExpandColumn: false,
                  expandedRowRender: (job) => (
                    <div style={{ paddingLeft: 72, background: '#0f1c2d', color: '#dbe7f3', paddingTop: 12, paddingBottom: 12 }}>
                      <Text strong style={{ color: '#f4f7fb' }}>
                        Raw Metadata:
                      </Text>
                      <p>{job.extensions}</p>
                      <Space>
                        <Text strong style={{ color: '#f4f7fb' }}>
                          Apply Options:
                        </Text>
                        <Space wrap>
                          {job.apply_options?.map((o, i) => (
                            <Tag
                              key={i}
                              style={{
                                padding: '4px 8px',
                                cursor: 'pointer',
                                borderRadius: 999,
                                background: 'rgba(24, 119, 242, 0.16)',
                                borderColor: 'rgba(98, 176, 255, 0.28)',
                                color: '#9fd0ff'
                              }}
                              onClick={() => {
                                navigator.clipboard.writeText(o.link);
                                message.success(`Copied: ${o.title}'s job URL!`);
                              }}
                            >
                              {o.title}
                            </Tag>
                          ))}
                        </Space>
                      </Space>
                    </div>
                  )
                }}
                pagination={{ ...pagination, hideOnSinglePage: true }}
                onChange={(nextPagination) =>
                  setPagination((currentPagination) => ({
                    ...currentPagination,
                    ...nextPagination
                  }))
                }
              />
            </Space>
          )}
        </SurfaceCard>
      </PageShell>
    </div>
  );
}
