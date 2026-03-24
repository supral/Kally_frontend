import { useEffect, useMemo, useRef, useState } from 'react';
import type { PackageItem } from '../../../api/packages';
import { formatCurrency } from '../../../utils/money';

export function membershipPackagePickerLine(p: PackageItem): string {
  return `${p.name} — ${formatCurrency(p.price)} (${p.totalSessions ?? 1} sessions)`;
}

type Props = {
  packages: PackageItem[];
  packageId: string;
  onPackageIdChange: (id: string) => void;
  disabled?: boolean;
  /** Extra classes on outer wrap (e.g. auth-form width) */
  className?: string;
  /** Extra classes on the text input (e.g. settings-input) */
  inputClassName?: string;
  id?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
};

export default function MembershipPackageCombobox({
  packages,
  packageId,
  onPackageIdChange,
  disabled = false,
  className = '',
  inputClassName = '',
  id,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedPackage = useMemo(() => packages.find((p) => String(p.id) === String(packageId)), [packages, packageId]);

  useEffect(() => {
    if (!packageId) setSearch('');
  }, [packageId]);

  const searchLower = search.trim().toLowerCase();
  const filteredPackages = useMemo(() => {
    if (!searchLower) return packages;
    return packages.filter((p) => {
      const name = (p.name ?? '').toLowerCase();
      const priceStr = String(p.price ?? '');
      const sessions = String(p.totalSessions ?? 1);
      return name.includes(searchLower) || priceStr.includes(searchLower) || sessions.includes(searchLower);
    });
  }, [packages, searchLower]);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      const target = ev.target as Node;
      if (wrapRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const wrapClass = ['create-membership-customer-wrap', className].filter(Boolean).join(' ');
  const fieldClass = ['create-membership-customer-input', inputClassName].filter(Boolean).join(' ');

  return (
    <div ref={wrapRef} className={wrapClass}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={fieldClass}
        disabled={disabled}
        value={packageId && selectedPackage ? membershipPackagePickerLine(selectedPackage) : search}
        onChange={(e) => {
          onPackageIdChange('');
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => !disabled && setOpen(true)}
        placeholder="Search package name, price, or sessions"
        autoComplete="off"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-autocomplete="list"
        aria-expanded={open}
        role="combobox"
      />
      {!!packageId && !disabled && (
        <button
          type="button"
          className="create-membership-clear-customer"
          onClick={() => {
            onPackageIdChange('');
            setSearch('');
            setOpen(true);
            inputRef.current?.focus();
          }}
          aria-label="Clear package selection"
        >
          ×
        </button>
      )}
      {open && !disabled && (
        <ul className="customer-name-dropdown settlements-dropdown create-membership-customer-dropdown" role="listbox">
          {filteredPackages.length === 0 ? (
            <li className="create-membership-customer-empty">No packages match</li>
          ) : (
            filteredPackages.slice(0, 100).map((p) => (
              <li key={p.id} role="option" aria-selected={String(packageId) === String(p.id)}>
                <button
                  type="button"
                  className="dropdown-item"
                  onClick={() => {
                    onPackageIdChange(String(p.id));
                    setSearch('');
                    setOpen(false);
                    inputRef.current?.blur();
                  }}
                >
                  {membershipPackagePickerLine(p)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
