import { LOADER_BLACK } from '@/config/constants';
import Image from 'next/image';

export default function LoadingBlack() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ position: 'relative', left: '50%', top: '50%' }}>
        <Image src={LOADER_BLACK.src} alt={''} width={100} height={100} style={{ color: 'black' }} />
      </div>
    </div>
  );
}
