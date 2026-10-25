import React from 'react';
export default function Image({fill: _fill, priority: _priority, alt, ...props}:
  React.ComponentProps<'img'> & {fill?: boolean; priority?: boolean}) {
  void _fill; void _priority;
  // eslint-disable-next-line @next/next/no-img-element -- Framework image stand-in in a local browser fixture.
  return <img alt={alt} {...props}/>;
}
