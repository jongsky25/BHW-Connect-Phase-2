import React from 'react';
// Local fixture preserves native lazy image loading without Next's optimizer.
export default function Image({unoptimized, alt = '', ...props}: React.ImgHTMLAttributes<HTMLImageElement> & {unoptimized?: boolean}) {
  void unoptimized;
  // eslint-disable-next-line @next/next/no-img-element
  return <img loading="lazy" alt={alt} {...props}/>;
}
