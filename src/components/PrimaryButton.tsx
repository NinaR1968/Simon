import type { ButtonHTMLAttributes } from 'react';

export default function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className="primary-button" />;
}
