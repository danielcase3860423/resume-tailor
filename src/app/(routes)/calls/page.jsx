'use client';
import { useEffect, useState } from 'react';
import ZadarmaWidget from '@/_components/layout/common/ZadarmaWidget';
import { useGlobalContext } from '@/context/auth';
import { showToastErrorMsg } from '@/helpers/frontend';
import { PageShell, SurfaceCard } from '@/_components/layout/client/styled';

export default function Calls() {
  const { loginUser } = useGlobalContext();
  const { user: currentUser } = loginUser;
  const [zadarmaKeys, setZadarmaKeys] = useState(null);

  const loadKeys = async () => {
    if (currentUser && currentUser?.id) {
      try {
        const res = await fetch('/api/phones/zadarma-webphone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id })
        });
        const { response } = await res.json();
        console.log(response);
        setZadarmaKeys({ key: response.key, login: response.login });
      } catch (err) {
        console.error('Error zadarma keys:', err);
        showToastErrorMsg('Failed to fetch zadarma keys.');
      }
    }
  };

  useEffect(() => {
    loadKeys();
  }, [currentUser]);

  return (
    <div className='container'>
      <PageShell>
        <SurfaceCard>
          <ZadarmaWidget keyId={zadarmaKeys?.key} login={zadarmaKeys?.login} />
        </SurfaceCard>
      </PageShell>
    </div>
  );
}
