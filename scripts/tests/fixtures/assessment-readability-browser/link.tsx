import React from 'react';
export default function Link({prefetch: _prefetch, children, ...props}:
  React.ComponentProps<'a'> & {prefetch?: boolean}) {
  void _prefetch;
  return <a {...props}>{children}</a>;
}
