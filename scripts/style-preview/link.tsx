import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { useRouter } from './navigation';

const Link = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement>>(function Link({
  href, onClick, ...props
}, ref) {
  const router = useRouter();
  return <a {...props} href={href} ref={ref} onClick={event => {
    onClick?.(event);
    const anchor = event.currentTarget;
    if (event.defaultPrevented || !href || event.button !== 0 || event.metaKey || event.ctrlKey ||
        event.shiftKey || event.altKey || (anchor.target && anchor.target !== '_self') ||
        anchor.hasAttribute('download') || anchor.origin !== location.origin) return;

    event.preventDefault();
    router.push(anchor.href);
  }} />;
});

export default Link;
