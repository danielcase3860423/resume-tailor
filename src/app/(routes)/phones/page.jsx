'use client';
import { useEffect, useState } from 'react';
import { Dropdown, Modal, Button, Form, Input, Spin, Popconfirm, Select } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import phoneService from '@/services/(routes)/phones';
import userService from '@/services/(routes)/users';
import profileService from '@/services/(routes)/profiles';
import { showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
import { DEFAULT_PAGINATION_SIZE, PHONE_TABLE_COLUMNS_BASE } from '@/config/constants';
import {
  SpinWrapper,
  StyledButton,
  ColorTable,
  PageShell,
  SurfaceCard,
  PageToolbar,
  ToolbarGroup
} from '@/_components/layout/client/styled';
import { formatPhoneNumber } from '@/helpers/common';

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
      <Popconfirm title='Delete this profile?' okText='Yes' cancelText='No' onConfirm={() => handleDelete(record._id)}>
        Delete
      </Popconfirm>
    ),
    icon: <DeleteOutlined />,
    danger: true
  }
];

export const ActionDropdown = ({ record, openEdit, handleDelete }) => (
  <Dropdown
    trigger={['click']}
    menu={{
      items: menuItems(record, openEdit, handleDelete)
    }}
  >
    <Button type='text' icon={<MoreOutlined />} />
  </Dropdown>
);

export default function Phone() {
  const [isLoading, setLoading] = useState(true);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [userData, setUserData] = useState([]);
  const [profileData, setProfileData] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingPhoneNumber, setEditingPhoneNumber] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  // 🧩 Open Edit Modal
  const openEdit = (record) => {
    setEditingPhoneNumber(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  // 🧩 Open Add Modal
  const openAdd = () => {
    setEditingPhoneNumber(null);
    form.resetFields();
    setModalOpen(true);
  };

  const TABLE_COLUMNS = [
    {
      title: 'NUMBER',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
      render: (phoneNumber) => formatPhoneNumber(phoneNumber)
    },
    ...PHONE_TABLE_COLUMNS_BASE,
    {
      title: 'USER',
      dataIndex: 'associatedUserId',
      key: 'associatedUserId',
      render: (userId) => {
        const user = userData.find((u) => u._id === userId);
        return <strong>{user ? user.username : '--'}</strong>;
      }
    },
    {
      title: 'PROFILE',
      dataIndex: 'associatedProfileId',
      key: 'associatedProfileId',
      render: (profileId) => {
        const profile = profileData.find((p) => p._id === profileId);
        return profile ? profile.profileName : 'N/A';
      }
    },
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
      const data = await userService.getUsersByRole();
      if (data.error) {
        showToastErrorMsg(data.msg);
      } else {
        setUserData(data.users || []);
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
        setProfileData(data.profiles || []);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      showToastErrorMsg('Failed to load profiles.');
    }
  };

  // 🧩 Fetch Phone Numbers
  const fetchPhoneNumbers = async () => {
    try {
      setLoading(true);
      const data = await phoneService.getPhoneNumbers();
      if (data.error) {
        showToastErrorMsg(data.msg);
      } else {
        setPhoneNumbers(data.phones || []);
      }
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      showToastErrorMsg('Failed to load phone numbers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchProfiles();
    fetchPhoneNumbers();
  }, []);

  // 🧩 Handle Submit (Add / Edit)
  const handleSubmit = async () => {
    if (isSubmitting) return; // prevent double click
    setIsSubmitting(true);
    try {
      const values = await form.validateFields();
      if (editingPhoneNumber) {
        await phoneService.updatePhoneNumber(editingPhoneNumber._id, values);
        showToastInfoMsg('Phone number updated successfully.');
      } else {
        await phoneService.createPhoneNumber(values);
        showToastInfoMsg('Phone number added successfully.');
      }
      setModalOpen(false);
      setEditingPhoneNumber(null);
      form.resetFields();
      fetchPhoneNumbers();
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🧩 Handle Delete
  const handleDelete = async (id) => {
    try {
      await phoneService.deletePhoneNumber(id);
      showToastInfoMsg('Phone Number is deleted.');
      fetchPhoneNumbers();
    } catch (err) {
      showToastErrorMsg('Failed to delete a phone number.');
    }
  };

  return (
    <>
      <div className='container'>
        <PageShell>
          <SurfaceCard>
            <PageToolbar>
              <ToolbarGroup>
                <h5 style={{ margin: 0 }}>Phone Numbers: {phoneNumbers.length}</h5>
              </ToolbarGroup>
              <ToolbarGroup>
                <StyledButton type='primary' icon={<PlusOutlined />} onClick={openAdd}>
                  Add Number
                </StyledButton>
              </ToolbarGroup>
            </PageToolbar>
            {isLoading ? (
              <SpinWrapper>
                <Spin size='large' delay={1000} />
              </SpinWrapper>
            ) : (
              <ColorTable columns={TABLE_COLUMNS} dataSource={phoneNumbers} rowKey='_id' pagination={{ pageSize: DEFAULT_PAGINATION_SIZE }} />
            )}
          </SurfaceCard>
        </PageShell>
      </div>
      <Modal
        title={editingPhoneNumber ? 'Edit Phone' : 'Add Phone'}
        open={isModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText='Submit'
        cancelText='Cancel'
        okButtonProps={{ disabled: isSubmitting }}
        confirmLoading={isSubmitting}
      >
        <Form layout='vertical' form={form}>
          <Form.Item
            label='Phone Number'
            name='phoneNumber'
            rules={[
              { required: true, message: 'Phone number is required' },
              {
                validator: (_, value) => {
                  if (!value) {
                    return Promise.reject('Please enter a phone number');
                  }

                  // Your custom validation logic:
                  if (!isValidPhoneNumber(value)) {
                    return Promise.reject('Invalid phone number format');
                  }

                  // Example: must be US phone number length
                  if (value.length < 10) {
                    return Promise.reject('Phone number is too short');
                  }

                  return Promise.resolve();
                }
              }
            ]}
          >
            <PhoneInput placeholder='Enter phone number' defaultCountry='US' />
          </Form.Item>
          <Form.Item label='Phone Server' name='sipServer'>
            <Input placeholder='Enter the Phone Server' />
          </Form.Item>
          <Form.Item label='Sip Username' name='sipUsername'>
            <Input placeholder='Enter the user name' />
          </Form.Item>
          <Form.Item label='Sip Password' name='sipPassword'>
            <Input.Password
              placeholder='Enter password'
              allowClear
              iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)}
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
          <Form.Item label='User' name='associatedUserId'>
            <Select
              placeholder='Select User'
              options={userData.map((user) => ({
                label: user.username,
                value: user._id
              }))}
            />
          </Form.Item>
          <Form.Item label='Profile' name='associatedProfileId'>
            <Select
              placeholder='Select Profile'
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
