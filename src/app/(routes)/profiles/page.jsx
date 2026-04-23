'use client';
import { useEffect, useState } from 'react';
import { Dropdown, Modal, Button, Form, Input, Spin, Popconfirm, Row, Col, Select, Radio, Card, Tag } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Country, State, City } from 'country-state-city';
import phoneService from '@/services/(routes)/phones';
import profileService from '@/services/(routes)/profiles';
import { showToastErrorMsg, showToastInfoMsg } from '@/helpers/frontend';
import { PROFILE_TABLE_COLUMNS_BASE, NON_STRUCTURED_COUNTRIES, DEFAULT_PAGINATION_SIZE } from '@/config/constants';
import { RESUME_TEMPLATE_OPTIONS, getResumeTemplateLabel } from '@/config/resume-templates';
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

export default function Profiles() {
  const [isLoading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  const openEdit = (record) => {
    setEditingProfile(record);
    form.setFieldsValue({
      ...record,
      profileTemplate: record.profileTemplate || 'template1'
    });
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingProfile(null);
    form.resetFields();
    form.setFieldsValue({
      profileTemplate: 'template1'
    });
    setModalOpen(true);
  };

  const PROFILE_TABLE_COLUMNS = [
    ...PROFILE_TABLE_COLUMNS_BASE,
    {
      title: 'TEMPLATE',
      dataIndex: 'profileTemplate',
      key: 'profileTemplate',
      width: '160px',
      render: (template) => (
        <Tag
          style={{
            marginInlineEnd: 0,
            borderRadius: 12,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            border: '1px solid rgba(25, 179, 138, 0.32)',
            background: 'rgba(25, 179, 138, 0.14)',
            color: '#8ff0cf'
          }}
        >
          {getResumeTemplateLabel(template || 'template1')}
        </Tag>
      )
    },
    {
      title: 'MOBILE',
      dataIndex: 'profileMobile',
      key: 'mobile',
      width: '160px',
      render: (mobile) => {
        const phone = phoneNumbers.find((p) => p.phoneNumber === mobile);
        return phone ? formatPhoneNumber(phone.phoneNumber) : <span style={{ color: '#999' }}>N/A</span>;
      }
    },
    {
      title: 'ACTIONS',
      key: 'actions',
      align: 'center',
      render: (_, record) => <ActionDropdown record={record} openEdit={openEdit} handleDelete={handleDelete} />
    }
  ];

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const data = await profileService.getProfiles();
      if (data.error) {
        showToastErrorMsg(data.msg);
      } else {
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      console.error('Error fetching profiles:', err);
      showToastErrorMsg('Failed to load profiles.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      const data = await phoneService.getPhoneNumbers();
      if (data.error) {
        showToastErrorMsg(data.msg);
      } else {
        setPhoneNumbers(data.phones || []);
      }
    } catch (err) {
      console.error('Error fetching phone numbers:', err);
      showToastErrorMsg('Failed to load phone numbers.');
    }
  };

  useEffect(() => {
    fetchProfiles();
    fetchPhoneNumbers();
  }, []);

  const filteredProfiles = profiles?.filter((u) => {
    const term = search.toLowerCase();
    return u.profileName?.toLowerCase().includes(term) || u.profileEmail?.toLowerCase().includes(term);
  });

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const values = await form.validateFields();
      if (editingProfile) {
        await profileService.updateProfile(editingProfile._id, values);
        showToastInfoMsg('Profile updated successfully.');
      } else {
        await profileService.createProfile(values);
        showToastInfoMsg('Profile added successfully.');
      }
      setModalOpen(false);
      setEditingProfile(null);
      form.resetFields();
      fetchProfiles();
    } catch (err) {
      console.error(err);
      showToastErrorMsg('Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await profileService.deleteProfile(id);
      showToastInfoMsg('Profile deleted.');
      fetchProfiles();
    } catch (err) {
      showToastErrorMsg('Failed to delete profile.');
    }
  };

  return (
    <>
      <PageShell>
        <SectionStack>
          <DashboardPageHeader>
            <DashboardPageIntro>
              <h1>Profile Library</h1>
              <p>Organize candidate profiles, preferred templates, and contact details in the same dashboard-style workspace used across the app.</p>
            </DashboardPageIntro>
            <DashboardMetaRow>
              <DashboardMetaChip>{profiles.length} total profiles</DashboardMetaChip>
              <DashboardMetaChip>{filteredProfiles?.length || 0} visible</DashboardMetaChip>
            </DashboardMetaRow>
          </DashboardPageHeader>

          <DashboardStatGrid>
            <DashboardStatCard>
              <strong>Total profiles</strong>
              <b>{profiles.length}</b>
              <span>Profiles stored in the library</span>
            </DashboardStatCard>
            <DashboardStatCard>
              <strong>Visible profiles</strong>
              <b>{filteredProfiles?.length || 0}</b>
              <span>Profiles matching the current search</span>
            </DashboardStatCard>
            <DashboardStatCard>
              <strong>Connected phones</strong>
              <b>{phoneNumbers.length}</b>
              <span>Available phone numbers linked to the workspace</span>
            </DashboardStatCard>
          </DashboardStatGrid>

          <DashboardTableSection>
            <DashboardSectionHeader>
              <div>
                <strong>Candidate profiles</strong>
                <span>Manage profile records, resume templates, and contact details in a consistent board-style table.</span>
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
                  Add Profile
                </StyledButton>
              </ToolbarGroup>
            </PageToolbar>
            {isLoading ? (
              <SpinWrapper>
                <Spin size='large' delay={1000} />
              </SpinWrapper>
            ) : (
              <ColorTable
                columns={PROFILE_TABLE_COLUMNS}
                dataSource={Array.isArray(filteredProfiles) ? filteredProfiles : []}
                rowKey='_id'
                pagination={{ pageSize: DEFAULT_PAGINATION_SIZE }}
              />
            )}
          </DashboardTableSection>
        </SectionStack>
      </PageShell>
      <Modal
        title={editingProfile ? 'Edit Profile' : 'Add Profile'}
        open={isModalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        okText='Submit'
        cancelText='Cancel'
        width='90vw'
        style={{ maxWidth: '1600px' }}
        okButtonProps={{ disabled: isSubmitting }}
        confirmLoading={isSubmitting}
      >
        <Form layout='vertical' form={form}>
          <Row gutter={16}>
            <Col xs={24} xl={6}>
              <Form.Item label='Profile Name' name='profileName' rules={[{ required: true }]}>
                <Input placeholder='Name' />
              </Form.Item>
            </Col>
            <Col xs={24} xl={6}>
              <Form.Item label='Title' name='profileTitle' rules={[{ required: true, message: 'Please enter title!' }]}>
                <Input placeholder='Title' />
              </Form.Item>
            </Col>
            <Col xs={24} xl={6}>
              <Form.Item label='Email' name='profileEmail' rules={[{ required: true, type: 'email' }]}>
                <Input placeholder='Email' type='email' />
              </Form.Item>
            </Col>
            <Col xs={24} xl={6}>
              <Form.Item label='Mobile' name='profileMobile'>
                <Select
                  placeholder='Select phone number'
                  showSearch
                  optionFilterProp='label'
                  options={phoneNumbers.map((p) => ({
                    label: formatPhoneNumber(p.phoneNumber),
                    value: p.phoneNumber
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label='LinkedIn' name='profileLinkedIn'>
            <Input placeholder='LinkedIn' />
          </Form.Item>
          <Form.Item label='Resume Template' name='profileTemplate' rules={[{ required: true, message: 'Please select a template.' }]}>
            <Radio.Group style={{ width: '100%' }}>
              <Row gutter={[12, 12]}>
                {RESUME_TEMPLATE_OPTIONS.map((template) => (
                  <Col xs={24} md={12} xl={8} key={template.value}>
                    <Radio value={template.value} style={{ width: '100%' }}>
                      <Card
                        size='small'
                        style={{
                          marginTop: 8,
                          borderRadius: 12
                        }}
                      >
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{template.label}</div>
                        <div style={{ color: '#666', fontSize: 12, lineHeight: 1.5 }}>{template.description}</div>
                      </Card>
                    </Radio>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>
          <Form.Item label='Address'>
            <Row gutter={16}>
              <Col xs={24} xl={4}>
                <Form.Item name={['profileAddress', 'country']} label='Country'>
                  <Select
                    showSearch
                    placeholder='Select Country'
                    options={Country.getAllCountries().map((c) => ({
                      label: c.name,
                      value: c.isoCode
                    }))}
                    optionFilterProp='label'
                    filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} xl={3}>
                <Form.Item
                  label='State / Province'
                  shouldUpdate={(prev, curr) => prev.profileAddress?.country !== curr.profileAddress?.country}
                >
                  {({ getFieldValue }) => {
                    const country = getFieldValue(['profileAddress', 'country']);
                    const states = country ? State.getStatesOfCountry(country) : [];
                    const hasStates = country && !NON_STRUCTURED_COUNTRIES.includes(country) && states.length > 0;

                    return (
                      <Form.Item name={['profileAddress', 'state']} noStyle>
                        {hasStates ? (
                          <Select
                            placeholder='Select State'
                            showSearch
                            disabled={!country}
                            options={states.map((s) => ({
                              label: s.name,
                              value: s.isoCode
                            }))}
                            optionFilterProp='label'
                            filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                          />
                        ) : (
                          <Input placeholder='State / Province' />
                        )}
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
              <Col xs={24} xl={5}>
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) =>
                    prev.profileAddress?.state !== curr.profileAddress?.state ||
                    prev.profileAddress?.country !== curr.profileAddress?.country
                  }
                >
                  {({ getFieldValue }) => {
                    const country = getFieldValue(['profileAddress', 'country']);
                    const state = getFieldValue(['profileAddress', 'state']);
                    const states = country ? State.getStatesOfCountry(country) : [];
                    const hasStates = states.length > 0;

                    let cities = [];
                    if (hasStates && country && state) {
                      cities = City.getCitiesOfState(country, state);
                    }

                    return (
                      <Form.Item name={['profileAddress', 'city']} label='City'>
                        {hasStates && cities.length > 0 ? (
                          <Select
                            placeholder='Select City'
                            disabled={!state}
                            showSearch
                            options={cities.map((c) => ({
                              label: c.name,
                              value: c.name
                            }))}
                            optionFilterProp='label'
                            filterOption={(input, option) => option.label.toLowerCase().includes(input.toLowerCase())}
                          />
                        ) : (
                          <Input placeholder='City' />
                        )}
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
              <Col xs={24} xl={9}>
                <Form.Item name={['profileAddress', 'street']} label='Street'>
                  <Input placeholder='Street Address' />
                </Form.Item>
              </Col>
              <Col xs={24} xl={3}>
                <Form.Item name={['profileAddress', 'zip']} label='Zip Code'>
                  <Input placeholder='Postal Code' />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.List
            name='profileEducation'
            initialValue={editingProfile?.profileEducation || []}
            rules={[
              {
                validator: async (_, names) => {
                  if (!names || names.length < 1) {
                    return Promise.reject(new Error('At least one education field is required.'));
                  }
                }
              }
            ]}
          >
            {(fields, { add, remove }) => (
              <>
                <Form.Item label='Education'>
                  {fields.map(({ key, fieldKey, name, field }) => (
                    <Row gutter={16} key={key}>
                      <Col xs={24} xl={7}>
                        <Form.Item {...field} name={[name, 'institution']} label='Institution' rules={[{ required: true }]}>
                          <Input placeholder='Institution Name' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={2}>
                        <Form.Item {...field} name={[name, 'finalEvaluationGrade']} label='FEG'>
                          <Input placeholder='Final Evaluation Grade' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={3}>
                        <Form.Item {...field} name={[name, 'startDate']} label='Start Date' rules={[{ required: true }]}>
                          <Input placeholder='Start Date' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={3}>
                        <Form.Item {...field} name={[name, 'yearOfCompletion']} label='End Date'>
                          <Input placeholder='Year Of Completion' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={4}>
                        <Form.Item {...field} name={[name, 'fieldOfStudy']} label='Field of Study' rules={[{ required: true }]}>
                          <Input placeholder='Field of Study' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={4}>
                        <Form.Item {...field} name={[name, 'educationLevel']} label='Education Level' rules={[{ required: true }]}>
                          <Input placeholder='Education Level' />
                        </Form.Item>
                      </Col>
                      <Col
                        xs={24}
                        xl={1}
                        style={{
                          display: 'flex',
                          alignItems: 'center', // vertical center
                          justifyContent: 'center' // optional: horizontal center
                        }}
                      >
                        <Button type='dashed' icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </Col>
                    </Row>
                  ))}
                  <Form.Item>
                    <Button type='dashed' onClick={() => add()} icon={<PlusOutlined />}>
                      Add Education
                    </Button>
                  </Form.Item>
                </Form.Item>
              </>
            )}
          </Form.List>
          <Form.List
            name='profileWorkExperience'
            initialValue={editingProfile?.profileWorkExperience || []}
            rules={[
              {
                validator: async (_, names) => {
                  if (!names || names.length < 1) {
                    return Promise.reject(new Error('At least one work experience field is required.'));
                  }
                }
              }
            ]}
          >
            {(fields, { add, remove }) => (
              <>
                <Form.Item label='Work Experience'>
                  {fields.map(({ key, fieldKey, name, field }) => (
                    <Row gutter={16} key={key}>
                      <Col xs={24} xl={7}>
                        <Form.Item {...field} name={[name, 'employer']} label='Employer' rules={[{ required: true }]}>
                          <Input placeholder='Employer Name' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={2}>
                        <Form.Item {...field} name={[name, 'employeeType']} label='Type'>
                          <Input placeholder='Employee Type' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={2}>
                        <Form.Item {...field} name={[name, 'startDate']} label='Start Date' rules={[{ required: true }]}>
                          <Input placeholder='Start Date' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={2}>
                        <Form.Item {...field} name={[name, 'endDate']} label='End Date'>
                          <Input placeholder='End Date' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={6}>
                        <Form.Item {...field} name={[name, 'jobTitle']} label='Job Title' rules={[{ required: true }]}>
                          <Input placeholder='Job Title' />
                        </Form.Item>
                      </Col>

                      <Col xs={24} xl={4}>
                        <Form.Item {...field} name={[name, 'location']} label='Location'>
                          <Input placeholder='Location' />
                        </Form.Item>
                      </Col>

                      <Col
                        xs={24}
                        xl={1}
                        style={{
                          display: 'flex',
                          alignItems: 'center', // vertical center
                          justifyContent: 'center' // optional: horizontal center
                        }}
                      >
                        <Button type='dashed' icon={<DeleteOutlined />} onClick={() => remove(name)} />
                      </Col>
                    </Row>
                  ))}
                  <Form.Item>
                    <Button type='dashed' onClick={() => add()} icon={<PlusOutlined />} style={{ marginBottom: '16px' }}>
                      Add Experience
                    </Button>
                  </Form.Item>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}
