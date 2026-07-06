'use client';
import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Modal, Popconfirm, Spin } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
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
  DashboardTableSection,
  DashboardSectionHeader,
  PageToolbar,
  ToolbarGroup
} from '@/_components/layout/client/styled';
import { DEFAULT_PAGINATION_SIZE } from '@/config/constants';

const { TextArea } = Input;

async function blacklistApi(path = '', options = {}) {
  const res = await fetch(`/api/company-blacklist${path}`, {
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.msg || 'Request failed');
  }
  return data;
}

export default function BlacklistPage() {
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState('');
  const [companyInput, setCompanyInput] = useState('');
  const [isLoading, setLoading] = useState(true);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form] = Form.useForm();

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const data = await blacklistApi();
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

    return companies.filter((company) => String(company.companyName || '').toLowerCase().includes(term));
  }, [companies, search]);

  const handleAddCompanies = async () => {
    const value = String(companyInput || '').trim();
    if (!value) {
      showToastErrorMsg('Enter at least one company name.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await blacklistApi('', {
        method: 'POST',
        body: JSON.stringify({ bulkValue: value })
      });

      setCompanyInput('');
      if (!data.createdCount) {
        showToastInfoMsg(data.skippedCount ? 'Company already blacklisted.' : 'No companies were added.');
      } else {
        showToastInfoMsg(
          `Added ${data.createdCount} compan${data.createdCount === 1 ? 'y' : 'ies'}.${data.skippedCount ? ` Skipped ${data.skippedCount} duplicate(s).` : ''}`
        );
      }
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
      await blacklistApi(`/${editingCompany._id}`, {
        method: 'PUT',
        body: JSON.stringify({ companyName: values.companyName })
      });
      showToastInfoMsg('Company updated.');
      setModalOpen(false);
      setEditingCompany(null);
      form.resetFields();
      await fetchCompanies();
    } catch (error) {
      if (!error?.errorFields) {
        showToastErrorMsg(error.message || 'Failed to update company.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompany = async (id) => {
    try {
      await blacklistApi(`/${id}`, { method: 'DELETE' });
      showToastInfoMsg('Company removed.');
      await fetchCompanies();
    } catch (error) {
      showToastErrorMsg(error.message || 'Failed to delete company.');
    }
  };

  const columns = [
    { title: 'COMPANY NAME', dataIndex: 'companyName', key: 'companyName' },
    {
      title: 'ADDED',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (value) =>
        value
          ? new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
          : 'N/A'
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      align: 'center',
      render: (_, record) => (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
          <Button
            type='text'
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({ companyName: record.companyName });
              setEditingCompany(record);
              setModalOpen(true);
            }}
          />
          <Popconfirm title='Remove this company?' okText='Yes' cancelText='No' onConfirm={() => handleDeleteCompany(record._id)}>
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
            <p>Block resume generation for specific companies.</p>
          </DashboardPageIntro>
          <DashboardMetaRow>
            <DashboardMetaChip>{companies.length} blocked</DashboardMetaChip>
          </DashboardMetaRow>
        </DashboardPageHeader>

        <DashboardTableSection>
          <DashboardSectionHeader>
            <div>
              <strong>Companies</strong>
              <span>Add one name per line. Duplicates are skipped automatically.</span>
            </div>
          </DashboardSectionHeader>

          <PageToolbar>
            <ToolbarGroup>
              <Input
                placeholder='Search companies...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 280 }}
              />
              <StyledButton type='primary' icon={<PlusOutlined />} loading={isSubmitting} onClick={handleAddCompanies}>
                Add
              </StyledButton>
            </ToolbarGroup>
          </PageToolbar>

          <TextArea
            rows={4}
            value={companyInput}
            onChange={(e) => setCompanyInput(e.target.value)}
            placeholder={'1Password\nCoinbase'}
            style={{ marginBottom: 16, fontFamily: 'monospace', fontSize: 12 }}
          />

          {isLoading ? (
            <SpinWrapper>
              <Spin size='large' delay={500} />
            </SpinWrapper>
          ) : (
            <ColorTable
              columns={columns}
              dataSource={filteredCompanies}
              rowKey='_id'
              pagination={{ pageSize: DEFAULT_PAGINATION_SIZE, showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'] }}
              locale={{ emptyText: 'No blacklisted companies found' }}
            />
          )}
        </DashboardTableSection>
      </SectionStack>

      <Modal
        title='Edit company'
        open={isModalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingCompany(null);
          form.resetFields();
        }}
        onOk={handleSaveCompany}
        okText='Save'
        confirmLoading={isSubmitting}
        destroyOnClose
      >
        <Form form={form} layout='vertical' style={{ marginTop: 16 }}>
          <Form.Item label='Company name' name='companyName' rules={[{ required: true, message: 'Enter a company name' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </PageShell>
  );
}
