import { LOADER } from '@/config/constants';
import Image from 'next/image';

export default function Loading() {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div style={{ position: 'relative', left: '50%', top: '50%' }}>
        <Image src={LOADER.src} alt={''} width={100} height={100} />
      </div>
    </div>
  );
}
