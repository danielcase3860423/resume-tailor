'use client';
import { useEffect, useMemo, useState } from 'react';
import { Dropdown, Modal, Button, Form, Input, Select, Spin, Popconfirm, Tag } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
import userService from '@/services/(routes)/users';
import profileService from '@/services/(routes)/profiles';
import { DEFAULT_PAGINATION_SIZE, USER_TABLE_COLUMNS_BASE } from '@/config/constants';
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

const menuItems = (record, openEdit, handleDelete) => [
  {
    key: 'edit',
    label: 'Edit',
    icon: <EditOutlined />,
    onClick: () => openEdit(record)
  },
  {
    key: 'delete',
    label: (
      <Popconfirm title='Delete this user?' okText='Yes' cancelText='No' onConfirm={() => handleDelete(record._id)}>
        Delete
      </Popconfirm>
    ),
    icon: <DeleteOutlined />,
    danger: true
  }
];

export const ActionDropdown = ({ record, openEdit, handleDelete }) => (
  <Dropdown trigger={['click']} menu={{ items: menuItems(record, openEdit, handleDelete) }}>
    <Button type='text' icon={<MoreOutlined />} />
  </Dropdown>
);

export default function Users() {
  const [isLoading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [profileData, setProfiles] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  const profileNameById = useMemo(
    () =>
      new Map(
        (profileData || []).map((profile) => [String(profile._id), profile.profileName || 'Unnamed Profile'])
      ),
    [profileData]
  );

  const totalAssignedProfiles = useMemo(
    () => users.reduce((count, user) => count + (Array.isArray(user?.profiles) ? user.profiles.length : 0), 0),
    [users]
  );

  const renderAssignedProfiles = (profileIds = []) => {
    if (!Array.isArray(profileIds) || !profileIds.length) {
      return <span style={{ color: 'rgba(168, 183, 211, 0.72)' }}>Unassigned</span>;
    }

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {profileIds.map((profileId, index) => {
          const name = profileNameById.get(String(profileId)) || 'Unknown Profile';
          const palette = [
            { border: 'rgba(112, 241, 164, 0.4)', background: 'rgba(112, 241, 164, 0.18)', color: '#b4ffd0' },
            { border: 'rgba(104, 176, 255, 0.4)', background: 'rgba(104, 176, 255, 0.16)', color: '#b8ddff' },
            { border: 'rgba(255, 171, 92, 0.4)', background: 'rgba(255, 171, 92, 0.16)', color: '#ffd5a5' },
            { border: 'rgba(222, 129, 255, 0.4)', background: 'rgba(222, 129, 255, 0.16)', color: '#f0b9ff' }
          ][index % 4];

          return (
            <Tag
              key={`${profileId}-${index}`}
              style={{
                marginInlineEnd: 0,
                borderRadius: 12,
                padding: '4px 10px',
                fontSize: 12,
                fontWeight: 600,
                border: `1px solid ${palette.border}`,
                background: palette.background,
                color: palette.color
              }}
            >
              {name}
            </Tag>
          );
        })}
      </div>
    );
  };

  const openEdit = (record) => {
    form.setFieldsValue({ ...record, profiles: record.profiles || [] });
    setEditingUser(record);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalOpen(true);
  };

  const USER_TABLE_COLUMNS = [
    ...USER_TABLE_COLUMNS_BASE.slice(0, 2),
    {
      title: 'ASSIGNED PROFILES',
      dataIndex: 'profiles',
      key: 'profiles',
      render: (profiles) => renderAssignedProfiles(profiles)
    },
    ...USER_TABLE_COLUMNS_BASE.slice(2),
    {
      title: 'ACTIONS',
      key: 'actions',
      align: 'center',
      render: (_, record) => <ActionDropdown record={record} openEdit={openEdit} handleDelete={handleDelete} />
    }
  ];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers();
      if (data.error) {
        showToastErrorMsg(data.msg);
      } else {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      showToastErrorMsg('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const data = await profileService.getProfiles();
      if (data.error) {
        showToastErrorMsg(data.msg);
      } else {
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      showToastErrorMsg('Failed to load profiles.');
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchUsers();
  }, []);

  const filteredUsers = users?.filter((u) => {
    const term = search.toLowerCase();
    const assignedProfileNames = (u.profiles || [])
      .map((profileId) => profileNameById.get(String(profileId)) || '')
      .join(' ')
      .toLowerCase();

    return (
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      assignedProfileNames.includes(term)
    );
  });

  const handleSubmit = async () => {
    if (isSubmitting) return; // prevent double click
    setIsSubmitting(true);
    try {
      const values = await form.validateFields();
      if (editingUser) {
        await userService.updateUser(editingUser._id, values);
        showToastInfoMsg('User updated successfully.');
      } else {
        await userService.createUser(values);
        showToastInfoMsg('User added successfully.');
      }
      setModalOpen(false);
      setEditingUser(null);
      form.resetFields();
      fetchUsers();
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await userService.deleteUser(id);
      showToastInfoMsg('User deleted.');
      fetchUsers();
    } catch (err) {
      showToastErrorMsg('Failed to delete user.');
    }
  };

  return (
    <>
      <PageShell>
        <SectionStack>
          <DashboardPageHeader>
            <DashboardPageIntro>
              <h1>User Directory</h1>
              <p>Manage team access, roles, and assigned profiles from the same dark workspace layout as the delivery dashboard.</p>
            </DashboardPageIntro>
            <DashboardMetaRow>
              <DashboardMetaChip>{users.length} total users</DashboardMetaChip>
              <DashboardMetaChip>{filteredUsers?.length || 0} visible</DashboardMetaChip>
            </DashboardMetaRow>
          </DashboardPageHeader>

          <DashboardStatGrid>
            <DashboardStatCard>
              <strong>Total users</strong>
              <b>{users.length}</b>
              <span>All accounts available in the workspace</span>
            </DashboardStatCard>
            <DashboardStatCard>
              <strong>Visible users</strong>
              <b>{filteredUsers?.length || 0}</b>
              <span>Results matching the current search</span>
            </DashboardStatCard>
            <DashboardStatCard>
              <strong>Profiles linked</strong>
              <b>{totalAssignedProfiles}</b>
              <span>Total active profile assignments across all users</span>
            </DashboardStatCard>
          </DashboardStatGrid>

          <DashboardTableSection>
            <DashboardSectionHeader>
              <div>
                <strong>Workspace users</strong>
                <span>Search, edit, and manage user roles in the same board-style table view used on the dashboard.</span>
              </div>
            </DashboardSectionHeader>
            <PageToolbar>
              <ToolbarGroup>
                <Input
                  size='middle'
                  placeholder='Search by name or email...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: 280 }}
                />
              </ToolbarGroup>
              <ToolbarGroup>
                <StyledButton size='middle' type='primary' icon={<PlusOutlined />} onClick={openAdd}>
                  Add User
                </StyledButton>
              </ToolbarGroup>
            </PageToolbar>
            {isLoading ? (
              <SpinWrapper>
                <Spin size='large' delay={500} />
              </SpinWrapper>
            ) : (
              <ColorTable
                columns={USER_TABLE_COLUMNS}
                dataSource={Array.isArray(filteredUsers) ? filteredUsers : []}
                rowKey='_id'
                pagination={{ pageSize: DEFAULT_PAGINATION_SIZE }}
                locale={{ emptyText: 'No users found' }}
              />
            )}
          </DashboardTableSection>
        </SectionStack>
      </PageShell>
      <Modal
        title={editingUser ? 'Edit User' : 'Add User'}
        open={isModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText='Submit'
        cancelText='Cancel'
        okButtonProps={{ disabled: isSubmitting }}
        confirmLoading={isSubmitting}
      >
        <Form layout='vertical' form={form}>
          <Form.Item label='Full Name' name='username' rules={[{ required: true }]}>
            <Input placeholder='Full Name' />
          </Form.Item>
          <Form.Item label='Email' name='email' rules={[{ required: true, type: 'email' }]}>
            <Input placeholder='Email' />
          </Form.Item>
          <Form.Item label='Role' name='role' rules={[{ required: true }]}>
            <Select
              placeholder='Select Role'
              options={[
                { label: 'VA', value: 'VA' },
                { label: 'Caller', value: 'CALLER' }
              ]}
            />
          </Form.Item>
          <Form.Item label='Status' name='status'>
            <Select
              placeholder='Select Status'
              options={[
                { label: 'Active', value: 'ACTIVE' },
                { label: 'Inactive', value: 'INACTIVE' }
              ]}
            />
          </Form.Item>
          <Form.Item label='Profiles' name='profiles'>
            <Select
              mode='multiple'
              placeholder='Select Profiles'
              optionFilterProp='label'
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              showSearch
              allowClear
              options={profileData.map((profile) => ({
                label: profile.profileName,
                value: profile._id
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
