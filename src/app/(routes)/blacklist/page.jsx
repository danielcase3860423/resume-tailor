'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Spin } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
import companyBlacklistService from '@/services/(routes)/company-blacklist';
import {
  SpinWrapper,
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
import { DEFAULT_PAGINATION_SIZE } from '@/config/constants';
import { useGlobalContext } from '@/context/auth';

const { TextArea } = Input;

export default function BlacklistPage() {
  const { loginUser } = useGlobalContext();
  const currentUserId = loginUser?.user?.id;
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState([]);
  const [search, setSearch] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: DEFAULT_PAGINATION_SIZE
  });

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await companyBlacklistService.getCompanies();

      if (!data || data.error) {
        throw new Error(data?.msg || 'Failed to load blacklisted companies.');
      }

      setCompanies(Array.isArray(data.companies) ? data.companies : []);
    } catch (error) {
      showToastErrorMsg(error.message || 'Failed to load blacklisted companies.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const filteredCompanies = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return companies;
    }

    return companies.filter((company) => {
      const candidate = `${company.companyName || ''} ${company.normalizedName || ''}`.toLowerCase();
      return candidate.includes(term);
    });
  }, [companies, search]);

  useEffect(() => {
    setSelectedCompanyIds((currentSelection) =>
      currentSelection.filter((id) => companies.some((company) => company._id === id))
    );
  }, [companies]);

  useEffect(() => {
    setPagination((currentPagination) => {
      const maxPage = Math.max(1, Math.ceil(filteredCompanies.length / currentPagination.pageSize));
      if (currentPagination.current <= maxPage) {
        return currentPagination;
      }

      return {
        ...currentPagination,
        current: maxPage
      };
    });
  }, [filteredCompanies.length]);

  const openEdit = (record) => {
    form.setFieldsValue({ companyName: record.companyName });
    setEditingCompany(record);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingCompany(null);
    form.resetFields();
  };

  const handleAddCompanies = async () => {
    const cleanedCompanyInput = String(companyInput || '').trim();
    if (!cleanedCompanyInput) {
      showToastErrorMsg('Please enter one or more company names to blacklist.');
      return;
    }

    setSubmitting(true);

    try {
      const data = await companyBlacklistService.createCompaniesBulk({
        bulkValue: cleanedCompanyInput,
        companyName: '',
        userId: currentUserId || ''
      });

      if (!data || data.error) {
        throw new Error(data?.msg || 'Failed to add blacklisted companies.');
      }

      setCompanyInput('');
      showToastInfoMsg(`Added ${data.createdCount || 0} companies.${data.skippedCount ? ` Skipped ${data.skippedCount} duplicates.` : ''}`);
      await fetchCompanies();
    } catch (error) {
      showToastErrorMsg(error.message || 'Failed to add blacklisted companies.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCompany = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      const data = await companyBlacklistService.updateCompany(editingCompany._id, {
        companyName: values.companyName
      });

      if (!data || data.error) {
        throw new Error(data?.msg || 'Failed to update blacklisted company.');
      }

      showToastInfoMsg('Blacklisted company updated.');
      closeModal();
      await fetchCompanies();
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      showToastErrorMsg(error.message || 'Failed to update blacklisted company.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    try {
      const data = await companyBlacklistService.deleteCompany(id);

      if (!data || data.error) {
        throw new Error(data?.msg || 'Failed to delete blacklisted company.');
      }

      showToastInfoMsg('Blacklisted company removed.');
      await fetchCompanies();
    } catch (error) {
      showToastErrorMsg(error.message || 'Failed to delete blacklisted company.');
    }
  };

  const handleDeleteSelectedCompanies = async () => {
    if (!selectedCompanyIds.length) {
      showToastErrorMsg('Please select one or more companies to remove.');
      return;
    }

    setSubmitting(true);

    try {
      await Promise.all(
        selectedCompanyIds.map(async (id) => {
          const data = await companyBlacklistService.deleteCompany(id);

          if (!data || data.error) {
            throw new Error(data?.msg || 'Failed to delete selected blacklisted companies.');
          }

          return data;
        })
      );

      const deletedCount = selectedCompanyIds.length;
      setSelectedCompanyIds([]);
      showToastInfoMsg(`Removed ${deletedCount} blacklisted companies.`);
      await fetchCompanies();
    } catch (error) {
      showToastErrorMsg(error.message || 'Failed to delete selected blacklisted companies.');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'COMPANY NAME',
      dataIndex: 'companyName',
      key: 'companyName'
    },
    {
      title: 'NORMALIZED KEY',
      dataIndex: 'normalizedName',
      key: 'normalizedName',
      render: (value) => <span style={{ color: 'rgba(230, 238, 248, 0.72)' }}>{value}</span>
    },
    {
      title: 'ADDED',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) => {
        if (!value) {
          return <span style={{ color: 'rgba(230, 238, 248, 0.72)' }}>N/A</span>;
        }

        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }).format(new Date(value));
      }
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          <Button type='text' icon={<EditOutlined />} onClick={() => openEdit(record)} />
          <Popconfirm title='Remove this blacklisted company?' okText='Yes' cancelText='No' onConfirm={() => handleDeleteCompany(record._id)}>
            <Button type='text' danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </div>
      )
    }
  ];

  return (
    <PageShell>
      <SectionStack>
        <DashboardPageHeader>
          <DashboardPageIntro>
            <h1>Blacklist Companies</h1>
            <p>Manage the company names that should block resume generation for VAs before they spend time applying.</p>
          </DashboardPageIntro>
          <DashboardMetaRow>
            <DashboardMetaChip>{companies.length} total blocked</DashboardMetaChip>
            <DashboardMetaChip>{filteredCompanies.length} visible</DashboardMetaChip>
          </DashboardMetaRow>
        </DashboardPageHeader>

        <DashboardStatGrid>
          <DashboardStatCard>
            <strong>Total blocked</strong>
            <b>{companies.length}</b>
            <span>All company names currently blocked for resume generation</span>
          </DashboardStatCard>
          <DashboardStatCard>
            <strong>Visible rows</strong>
            <b>{filteredCompanies.length}</b>
            <span>Results matching the current search</span>
          </DashboardStatCard>
        </DashboardStatGrid>

        <DashboardTableSection>
          <DashboardSectionHeader>
            <div>
              <strong>Blacklist directory</strong>
              <span>Create, edit, or remove blocked companies. You can also paste a newline-separated list for bulk insert.</span>
            </div>
          </DashboardSectionHeader>

          <PageToolbar>
            <ToolbarGroup>
              <Input
                size='middle'
                placeholder='Search blacklisted companies...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 280 }}
              />
            </ToolbarGroup>
          </PageToolbar>

          <div
            style={{
              marginBottom: 16,
              border: '1px solid rgba(148, 163, 184, 0.16)',
              borderRadius: 16,
              padding: 16,
              background: 'rgba(16, 28, 44, 0.36)'
            }}
          >
            <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong style={{ display: 'block', color: '#f4f7fb', fontSize: 14, marginBottom: 4 }}>Add companies</strong>
                <span style={{ color: 'rgba(230, 238, 248, 0.62)', fontSize: 12 }}>
                  Enter one company name or paste multiple company names, one per line.
                </span>
              </div>
              <StyledButton
                htmlType='button'
                size='middle'
                type='primary'
                icon={<PlusOutlined />}
                loading={isSubmitting}
                disabled={isSubmitting}
                onClick={handleAddCompanies}
              >
                Add Company
              </StyledButton>
            </div>
            <TextArea
              rows={8}
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
              placeholder={'Coinbase\nVeeva\nInsight Global'}
              style={{ fontFamily: 'monospace', fontSize: 12 }}
            />
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ color: 'rgba(230, 238, 248, 0.62)', fontSize: 12 }}>
                One line adds one company. Multiple lines add multiple companies in one action.
              </span>
              <div style={{ color: 'rgba(230, 238, 248, 0.62)', fontSize: 12 }}>
                Duplicate names are skipped automatically based on normalized company name matching.
              </div>
            </div>
          </div>

          <div
            style={{
              marginBottom: 14,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap'
            }}
          >
            <DashboardMetaChip>{selectedCompanyIds.length} selected</DashboardMetaChip>
            <Popconfirm
              title={`Remove ${selectedCompanyIds.length} selected companies?`}
              okText='Yes'
              cancelText='No'
              disabled={!selectedCompanyIds.length || isSubmitting}
              onConfirm={handleDeleteSelectedCompanies}
            >
              <Button
                htmlType='button'
                size='middle'
                type='primary'
                danger
                icon={<DeleteOutlined />}
                disabled={!selectedCompanyIds.length || isSubmitting}
                loading={isSubmitting && !isLoading}
              >
                Delete Selected
              </Button>
            </Popconfirm>
          </div>

          {isLoading ? (
            <SpinWrapper>
              <Spin size='large' delay={500} />
            </SpinWrapper>
          ) : (
            <ColorTable
              columns={columns}
              dataSource={filteredCompanies}
              rowKey='_id'
              rowSelection={{
                selectedRowKeys: selectedCompanyIds,
                onChange: (selectedRowKeys) => setSelectedCompanyIds(selectedRowKeys)
              }}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                showSizeChanger: true,
                pageSizeOptions: ['10', '20', '50', '100'],
                onChange: (current, pageSize) => {
                  setPagination({
                    current,
                    pageSize
                  });
                },
                onShowSizeChange: (current, pageSize) => {
                  setPagination({
                    current: 1,
                    pageSize
                  });
                }
              }}
              locale={{ emptyText: 'No blacklisted companies found' }}
            />
          )}
        </DashboardTableSection>
      </SectionStack>

      <Modal
        title='Edit blacklisted company'
        open={isModalOpen}
        onCancel={closeModal}
        onOk={handleSaveCompany}
        okText='Save'
        confirmLoading={isSubmitting}
        destroyOnClose
      >
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>
          <Form.Item
            label='Company name'
            name='companyName'
            rules={[{ required: true, message: 'Please enter a company name' }]}
          >
            <Input placeholder='Company name' />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
