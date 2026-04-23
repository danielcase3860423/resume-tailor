'use client';

import { useEffect, useMemo, useState } from 'react';
import { DatePicker, Empty, Spin, Space } from 'antd';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import dashboardService from '@/services/(routes)/dashboard';
import { useGlobalContext } from '@/context/auth';
import { CONSTANT_USER_ROLE_ADMIN, CONSTANT_USER_ROLE_USER } from '@/config/constants';
import { showToastErrorMsg } from '@/helpers/frontend';
import { ContentWrapper, LoginBtn, PageShell, SurfaceCard, SpinWrapper, StyledButton } from '@/_components/layout/client/styled';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

const PRESET_OPTIONS = [
  { value: 'this_month', label: 'This Month' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' }
];

const PERFORMANCE_OPTIONS = [
  { value: 'all', label: 'All Performance' },
  { value: 'high', label: 'High Performance' },
  { value: 'medium', label: 'Medium Performance' },
  { value: 'low', label: 'Low Performance' }
];

const DEFAULT_SORT = {
  key: 'total',
  direction: 'desc'
};

function buildRangeParams(preset, customRange) {
  if (preset === 'custom') {
    if (!customRange.startDate || !customRange.endDate) {
      return null;
    }

    return {
      preset,
      startDate: customRange.startDate,
      endDate: customRange.endDate
    };
  }

  return {
    preset,
    startDate: '',
    endDate: ''
  };
}

const DashboardWrap = styled.div`
  display: grid;
  gap: 14px;
  color: #e5edf7;
  min-width: 0;
`;

const WorkspaceBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  flex-wrap: wrap;
`;

const WorkspaceTitle = styled.div`
  display: grid;
  gap: 6px;

  h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.05;
    color: #f3f6fb;
  }

  p {
    margin: 0;
    max-width: 760px;
    font-size: 14px;
    line-height: 1.6;
    color: #93a4bc;
  }
`;

const WorkspaceMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const MetaChip = styled.span`
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: #101c2c;
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: #c8d3e3;
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
`;

const SummaryCard = styled.div`
  background: #0b1523;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 14px;
  padding: 14px 16px;
  display: grid;
  gap: 6px;
`;

const SummaryLabel = styled.span`
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #8296b2;
`;

const SummaryValue = styled.strong`
  font-size: 24px;
  line-height: 1;
  color: #f4f7fb;
`;

const SummaryHint = styled.span`
  font-size: 12px;
  color: #8ea1bb;
`;

const DarkPanel = styled.div`
  background: #0b1523;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  padding: 14px;
  min-width: 0;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
`;

const FilterCluster = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
`;

const Control = styled.select`
  min-height: 34px;
  background: #101c2c;
  color: #e6eef8;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;
`;

const SearchInput = styled.input`
  min-height: 34px;
  min-width: 220px;
  background: #101c2c;
  color: #e6eef8;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 14px;

  @media (max-width: 640px) {
    min-width: 100%;
  }
`;

const PlainButton = styled.button`
  min-height: 34px;
  background: ${({ $primary }) => ($primary ? '#0f9d79' : '#101c2c')};
  color: #fff;
  border: 1px solid ${({ $primary }) => ($primary ? '#0f9d79' : 'rgba(148, 163, 184, 0.16)')};
  border-radius: 10px;
  padding: 0 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
`;

const TableScroll = styled.div`
  width: 100%;
  max-width: 100%;
  overflow: auto;
  max-height: calc(100vh - 300px);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 14px;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
`;

const SimpleTable = styled.table`
  width: 100%;
  min-width: 1380px;
  border-collapse: collapse;
  table-layout: auto;

  th,
  td {
    border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    padding: 10px 12px;
    text-align: left;
    color: #e6eef8;
  }

  th {
    position: sticky;
    top: 0;
    z-index: 3;
    background: #101c2c;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #9fb0c7;
  }

  td {
    background: #0b1523;
    font-size: 14px;
  }

  tbody tr:hover td {
    background: #0f1c2d;
  }

  tbody tr.summary-row td {
    background: #0f1c2d;
    color: #f4f7fb;
    font-weight: 700;
  }

  tbody tr.summary-row:hover td {
    background: #0f1c2d;
  }

  th:first-child,
  td:first-child {
    position: sticky;
    left: 0;
    min-width: 220px;
    z-index: 2;
  }

  th:nth-child(2),
  td:nth-child(2) {
    position: sticky;
    left: 220px;
    min-width: 220px;
    z-index: 2;
  }

  thead th:first-child,
  thead th:nth-child(2) {
    z-index: 5;
  }
`;

const SortHeaderButton = styled.button`
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
`;

const SortIndicator = styled.span`
  color: ${({ $active }) => ($active ? '#e6eef8' : '#6b7d96')};
  font-size: 11px;
`;

const TableHeadBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 12px;
`;

const TableTitle = styled.div`
  display: grid;
  gap: 4px;

  strong {
    font-size: 16px;
    color: #f2f6fb;
  }

  span {
    font-size: 13px;
    color: #8fa2bb;
  }
`;

const TableMeta = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
`;

function compareValues(left, right) {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left || '').localeCompare(String(right || ''), undefined, { sensitivity: 'base' });
}

function buildFilteredRows(rows, searchTerm, performanceFilter, sortConfig) {
  const enrichedRows = rows.map((row) => ({
    ...row,
    peakCount: Math.max(0, ...(row.dailyCounts || []).map((cell) => cell.count || 0))
  }));

  const filtered = enrichedRows.filter((row) => {
    const haystack = `${row.label} ${row.secondaryLabel}`.toLowerCase();
    const matchesSearch = !searchTerm.trim() || haystack.includes(searchTerm.trim().toLowerCase());

    let matchesPerformance = true;
    if (performanceFilter === 'high') {
      matchesPerformance = row.average >= 20;
    } else if (performanceFilter === 'medium') {
      matchesPerformance = row.average >= 10 && row.average < 20;
    } else if (performanceFilter === 'low') {
      matchesPerformance = row.average < 10;
    }

    return matchesSearch && matchesPerformance;
  });

  return [...filtered].sort((left, right) => {
    let leftValue;
    let rightValue;

    if (sortConfig.key === 'label') {
      leftValue = left.label;
      rightValue = right.label;
    } else if (sortConfig.key === 'secondaryLabel') {
      leftValue = left.secondaryLabel;
      rightValue = right.secondaryLabel;
    } else if (sortConfig.key === 'total') {
      leftValue = left.total;
      rightValue = right.total;
    } else if (sortConfig.key === 'average') {
      leftValue = left.average;
      rightValue = right.average;
    } else if (sortConfig.key === 'activeDays') {
      leftValue = left.activeDays;
      rightValue = right.activeDays;
    } else if (sortConfig.key === 'todayCount') {
      leftValue = left.todayCount;
      rightValue = right.todayCount;
    } else if (sortConfig.key === 'peakCount') {
      leftValue = left.peakCount;
      rightValue = right.peakCount;
    } else {
      leftValue = left.dailyCounts.find((cell) => cell.key === sortConfig.key)?.count || 0;
      rightValue = right.dailyCounts.find((cell) => cell.key === sortConfig.key)?.count || 0;
    }

    const result = compareValues(leftValue, rightValue);
    return sortConfig.direction === 'asc' ? result : -result;
  });
}

function buildSummaryRow(rows, dailyColumns = [], totalDays = 0) {
  const dailyCounts = dailyColumns.map((column) => ({
    key: column.key,
    label: column.label,
    count: rows.reduce((sum, row) => sum + (row.dailyCounts.find((cell) => cell.key === column.key)?.count || 0), 0)
  }));

  const total = rows.reduce((sum, row) => sum + (row.total || 0), 0);
  const todayCount = rows.reduce((sum, row) => sum + (row.todayCount || 0), 0);
  const activeDays = dailyCounts.filter((cell) => cell.count > 0).length;
  const peakCount = dailyCounts.reduce((max, cell) => Math.max(max, cell.count || 0), 0);

  return {
    key: 'daily-total',
    label: 'Daily total',
    secondaryLabel: 'Visible rows',
    todayCount,
    total,
    average: totalDays ? Number((total / totalDays).toFixed(1)) : 0,
    activeDays,
    peakCount,
    dailyCounts
  };
}

function DashboardLoginState({ router, currentRole }) {
  return (
    <SurfaceCard>
      <Space style={{ flexWrap: 'wrap' }}>
        <StyledButton onClick={() => router.push('/resume')}>Open Resume Studio</StyledButton>
        <StyledButton variant='secondary' onClick={() => router.push(currentRole === 'CALLER' ? '/calls' : '/applies')}>
          {currentRole === 'CALLER' ? 'Open Calling Desk' : 'Review Applied History'}
        </StyledButton>
      </Space>
    </SurfaceCard>
  );
}

export default function HomeComponents() {
  const router = useRouter();
  const { loginUser } = useGlobalContext();
  const currentRole = loginUser?.user?.role;
  const [preset, setPreset] = useState('this_month');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [assistantSortConfig, setAssistantSortConfig] = useState(DEFAULT_SORT);
  const [profileSortConfig, setProfileSortConfig] = useState(DEFAULT_SORT);

  const canViewDashboard = currentRole === CONSTANT_USER_ROLE_ADMIN || currentRole === CONSTANT_USER_ROLE_USER;
  const queryParams = useMemo(() => buildRangeParams(preset, customRange), [preset, customRange]);

  useEffect(() => {
    if (!loginUser?.isLoggedIn || !canViewDashboard || !queryParams) {
      return;
    }

    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setErrorMsg('');

      const data = await dashboardService.getSummary(queryParams);

      if (cancelled) {
        return;
      }

      if (data?.error) {
        setDashboard(null);
        setErrorMsg(data.msg || 'Failed to load dashboard.');
        showToastErrorMsg(data.msg || 'Failed to load dashboard.');
      } else {
        setDashboard(data);
      }

      setLoading(false);
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [loginUser?.isLoggedIn, canViewDashboard, queryParams]);

  const assistantRows = useMemo(() => dashboard?.adminRows || [], [dashboard]);
  const profileRows = useMemo(() => dashboard?.profileRows || [], [dashboard]);

  const filteredAssistantRows = useMemo(
    () => buildFilteredRows(assistantRows, searchTerm, performanceFilter, assistantSortConfig),
    [assistantRows, searchTerm, performanceFilter, assistantSortConfig]
  );

  const filteredProfileRows = useMemo(
    () => buildFilteredRows(profileRows, searchTerm, performanceFilter, profileSortConfig),
    [profileRows, searchTerm, performanceFilter, profileSortConfig]
  );

  const assistantSummaryRow = useMemo(
    () => buildSummaryRow(filteredAssistantRows, dashboard?.range?.dailyColumns || [], dashboard?.range?.totalDays || 0),
    [filteredAssistantRows, dashboard?.range?.dailyColumns, dashboard?.range?.totalDays]
  );

  const profileSummaryRow = useMemo(
    () => buildSummaryRow(filteredProfileRows, dashboard?.range?.dailyColumns || [], dashboard?.range?.totalDays || 0),
    [filteredProfileRows, dashboard?.range?.dailyColumns, dashboard?.range?.totalDays]
  );

  const handleSort = (key, setSortConfig) => {
    setSortConfig((previous) => {
      if (previous.key === key) {
        return {
          key,
          direction: previous.direction === 'asc' ? 'desc' : 'asc'
        };
      }

      return {
        key,
        direction: key === 'label' || key === 'secondaryLabel' ? 'asc' : 'desc'
      };
    });
  };

  const renderSortableHeader = (label, key, sortConfig, setSortConfig) => {
    const isActive = sortConfig.key === key;
    const arrow = isActive ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕';

    return (
      <SortHeaderButton type='button' onClick={() => handleSort(key, setSortConfig)}>
        <span>{label}</span>
        <SortIndicator $active={isActive}>{arrow}</SortIndicator>
      </SortHeaderButton>
    );
  };

  const renderPerformanceTable = ({ title, description, primaryLabel, secondaryLabel, rows, summaryRow, sortConfig, setSortConfig }) => (
    <DarkPanel>
      <TableHeadBar>
        <TableTitle>
          <strong>{title}</strong>
          <span>{description}</span>
        </TableTitle>
        <TableMeta>
          <MetaChip>Sort any column</MetaChip>
          <MetaChip>Sticky leading columns</MetaChip>
        </TableMeta>
      </TableHeadBar>
      <TableScroll>
        {rows.length ? (
          <SimpleTable>
            <thead>
              <tr>
                <th>{renderSortableHeader(primaryLabel, 'label', sortConfig, setSortConfig)}</th>
                <th>{renderSortableHeader(secondaryLabel, 'secondaryLabel', sortConfig, setSortConfig)}</th>
                <th>{renderSortableHeader('Today', 'todayCount', sortConfig, setSortConfig)}</th>
                <th>{renderSortableHeader('Total', 'total', sortConfig, setSortConfig)}</th>
                <th>{renderSortableHeader('Avg / Day', 'average', sortConfig, setSortConfig)}</th>
                <th>{renderSortableHeader('Active Days', 'activeDays', sortConfig, setSortConfig)}</th>
                <th>{renderSortableHeader('Peak', 'peakCount', sortConfig, setSortConfig)}</th>
                {(dashboard?.range?.dailyColumns || []).map((column) => (
                  <th key={column.key}>{renderSortableHeader(column.label, column.key, sortConfig, setSortConfig)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className='summary-row'>
                <td>{summaryRow.label}</td>
                <td>{summaryRow.secondaryLabel}</td>
                <td>{summaryRow.todayCount || '—'}</td>
                <td>{summaryRow.total}</td>
                <td>{summaryRow.average}</td>
                <td>{summaryRow.activeDays}</td>
                <td>{summaryRow.peakCount || '—'}</td>
                {(summaryRow.dailyCounts || []).map((cell) => (
                  <td key={cell.key}>{cell.count || '—'}</td>
                ))}
              </tr>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>{row.label}</td>
                  <td>{row.secondaryLabel}</td>
                  <td>{row.todayCount || '—'}</td>
                  <td>{row.total}</td>
                  <td>{row.average}</td>
                  <td>{row.activeDays}</td>
                  <td>{row.peakCount || '—'}</td>
                  {(row.dailyCounts || []).map((cell) => (
                    <td key={cell.key}>{cell.count || '—'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </SimpleTable>
        ) : (
          <Empty description={errorMsg || 'No rows match the selected filters.'} />
        )}
      </TableScroll>
    </DarkPanel>
  );

  if (!loginUser?.isLoggedIn) {
    return (
      <ContentWrapper>
        <div className='container'>
          <PageShell>
            <SurfaceCard>
              <LoginBtn onClick={() => router.push('/login')}>Login</LoginBtn>
            </SurfaceCard>
          </PageShell>
        </div>
      </ContentWrapper>
    );
  }

  if (!canViewDashboard) {
    return (
      <ContentWrapper>
        <div className='container'>
          <PageShell>
            <DashboardLoginState router={router} currentRole={currentRole} />
          </PageShell>
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      <PageShell>
        {loading && !dashboard ? (
          <SpinWrapper>
            <Spin size='large' />
          </SpinWrapper>
        ) : (
          <DashboardWrap>
            <WorkspaceBar>
              <WorkspaceTitle>
                <h1>Resume Delivery Board</h1>
                <p>
                  Monitor throughput by {currentRole === CONSTANT_USER_ROLE_ADMIN ? 'assistant and profile' : 'profile'}, scan the entire selected range,
                  and sort the delivery grid the same way you would work a ticket board.
                </p>
              </WorkspaceTitle>
              <WorkspaceMeta>
                <MetaChip>{currentRole === CONSTANT_USER_ROLE_ADMIN ? 'Admin view' : 'VA view'}</MetaChip>
                <MetaChip>{(dashboard?.range?.dailyColumns || []).length} day columns</MetaChip>
                <MetaChip>
                  {dashboard?.range?.startDate || '----'} to {dashboard?.range?.endDate || '----'}
                </MetaChip>
              </WorkspaceMeta>
            </WorkspaceBar>

            <SummaryGrid>
              <SummaryCard>
                <SummaryLabel>Total resumes</SummaryLabel>
                <SummaryValue>{dashboard?.overview?.totalResumes ?? 0}</SummaryValue>
                <SummaryHint>All resumes generated in the selected range</SummaryHint>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Today</SummaryLabel>
                <SummaryValue>{dashboard?.overview?.resumesToday ?? 0}</SummaryValue>
                <SummaryHint>Current-day resume activity</SummaryHint>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Avg / day</SummaryLabel>
                <SummaryValue>{dashboard?.overview?.averagePerDay ?? 0}</SummaryValue>
                <SummaryHint>Average output across the visible range</SummaryHint>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Active assistants</SummaryLabel>
                <SummaryValue>{dashboard?.overview?.activeAssistants ?? 0}</SummaryValue>
                <SummaryHint>Assistants with at least one generated resume</SummaryHint>
              </SummaryCard>
              <SummaryCard>
                <SummaryLabel>Active profiles</SummaryLabel>
                <SummaryValue>{dashboard?.overview?.activeProfiles ?? 0}</SummaryValue>
                <SummaryHint>Profiles used during the selected period</SummaryHint>
              </SummaryCard>
            </SummaryGrid>

            <DarkPanel>
              <FilterRow>
                <FilterCluster>
                  <Control value={preset} onChange={(event) => setPreset(event.target.value)}>
                    {PRESET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Control>
                  <RangePicker
                    value={
                      customRange.startDate && customRange.endDate
                        ? [dayjs(customRange.startDate), dayjs(customRange.endDate)]
                        : null
                    }
                    onChange={(dates) => {
                      if (!dates || dates.length !== 2) {
                        setCustomRange({ startDate: '', endDate: '' });
                        if (preset === 'custom') {
                          setPreset('this_month');
                        }
                        return;
                      }

                      setPreset('custom');
                      setCustomRange({
                        startDate: dates[0].format('YYYY-MM-DD'),
                        endDate: dates[1].format('YYYY-MM-DD')
                      });
                    }}
                    allowClear
                    placeholder={['Start date', 'End date']}
                  />
                  <Control value={performanceFilter} onChange={(event) => setPerformanceFilter(event.target.value)}>
                    {PERFORMANCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Control>
                  <SearchInput
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder={currentRole === CONSTANT_USER_ROLE_ADMIN ? 'Search assistant, profile, or company' : 'Search profile or company'}
                  />
                </FilterCluster>
                <FilterCluster>
                  {currentRole === CONSTANT_USER_ROLE_ADMIN ? (
                    <>
                      <MetaChip>{filteredAssistantRows.length} assistant rows</MetaChip>
                      <MetaChip>{filteredProfileRows.length} profile rows</MetaChip>
                    </>
                  ) : (
                    <MetaChip>{filteredProfileRows.length} visible rows</MetaChip>
                  )}
                  <PlainButton
                    type='button'
                    onClick={async () => {
                      if (!queryParams) {
                        showToastErrorMsg('Please select both start and end dates for a custom range.');
                        return;
                      }

                      setLoading(true);
                      const data = await dashboardService.getSummary(queryParams);
                      if (data?.error) {
                        showToastErrorMsg(data.msg || 'Failed to refresh dashboard.');
                        setErrorMsg(data.msg || 'Failed to refresh dashboard.');
                      } else {
                        setDashboard(data);
                        setErrorMsg('');
                      }
                      setLoading(false);
                    }}
                  >
                    Refresh
                  </PlainButton>
                </FilterCluster>
              </FilterRow>
            </DarkPanel>

            {currentRole === CONSTANT_USER_ROLE_ADMIN
              ? renderPerformanceTable({
                  title: 'Assistant performance grid',
                  description: 'Scrollable delivery table with VA output and top profile usage across the selected date range.',
                  primaryLabel: 'Assistant',
                  secondaryLabel: 'Top Profile',
                  rows: filteredAssistantRows,
                  summaryRow: assistantSummaryRow,
                  sortConfig: assistantSortConfig,
                  setSortConfig: setAssistantSortConfig
                })
              : null}

            {renderPerformanceTable({
              title: currentRole === CONSTANT_USER_ROLE_ADMIN ? 'Profile performance grid' : 'Profile performance grid',
              description: 'Scrollable delivery table with profile output and top company usage across the selected date range.',
              primaryLabel: 'Profile',
              secondaryLabel: 'Top Company',
              rows: filteredProfileRows,
              summaryRow: profileSummaryRow,
              sortConfig: profileSortConfig,
              setSortConfig: setProfileSortConfig
            })}
          </DashboardWrap>
        )}
      </PageShell>
    </ContentWrapper>
  );
}
