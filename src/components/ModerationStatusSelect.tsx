import { FilterIcon, Select } from '@hypothesis/frontend-shared';
import classnames from 'classnames';
import { Fragment } from 'preact';

import type { ModerationStatus } from '../helpers';
import { moderationStatusInfo } from '../helpers';

export type ModerationStatusSelectProps = {
  alignListbox?: 'right' | 'left';
  disabled?: boolean;
} & (
  | {
      /** This select is used to filter a list of annotations by moderation status */
      mode: 'filter';
      selected?: ModerationStatus;
      onChange: (status?: ModerationStatus) => void;
    }
  | {
      /** This select is used to set the moderation status of a specific annotation */
      mode: 'select';
      selected: ModerationStatus;
      onChange: (status: ModerationStatus) => void;
    }
);

/**
 * A Select component displaying the list of moderation statuses.
 */
export default function ModerationStatusSelect({
  selected,
  onChange,
  mode,
  alignListbox = 'right',
  disabled,
}: ModerationStatusSelectProps) {
  const selectedName = selected
    ? moderationStatusInfo[selected]!.label
    : undefined;
  const SelectedIcon = selected
    ? moderationStatusInfo[selected]!.icon
    : Fragment;

  return (
    <Select
      value={selected}
      // Cast to bypass TS warning that callback does not accept `undefined`.
      // We will only include `undefined` in the options if `mode == "filter"`
      // and this is allowed.
      onChange={onChange as (value: ModerationStatus | undefined) => void}
      alignListbox={alignListbox}
      containerClasses="!w-auto"
      buttonClasses={classnames(
        mode === 'select' && {
          '!bg-green-light !text-green-dark': selected === 'APPROVED',
          '!bg-yellow-light !text-yellow-dark': selected === 'SPAM',
          '!bg-red-light !text-red-dark': selected === 'DENIED',
          // The styles above override default select disabled styles, so let's
          // add reduced opacity to those
          'disabled:opacity-50': selected !== 'PENDING',
        },
      )}
      aria-label="Moderation status"
      buttonContent={
        <div className="flex gap-x-1.5 items-center">
          {mode === 'filter' ? <FilterIcon /> : <SelectedIcon />}
          {selectedName ?? 'All'}
        </div>
      }
      disabled={disabled}
    >
      {mode === 'filter' && (
        <Select.Option value={undefined} classes="text-grey-7">
          All
        </Select.Option>
      )}
      {Object.entries(moderationStatusInfo).map(
        ([status, { label, icon: Icon }]) => (
          <Select.Option key={status} value={status}>
            <div className="flex gap-x-1.5 items-center text-grey-7">
              <Icon />
              {label}
            </div>
          </Select.Option>
        ),
      )}
    </Select>
  );
}
