import Image from 'next/image';

/** Decorative beside the SS Lotus name or an explicitly labelled control. */
export function BrandLogo({ size = 36, className }: Readonly<{ size?: number; className?: string }>) {
  return <Image src="/brand/lotus-app-icon.svg" alt="" width={size} height={size} className={className} />;
}
