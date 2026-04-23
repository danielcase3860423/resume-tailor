import { IMaskInput } from 'react-imask';

export default function PhoneInput({ id, name, disabled, value, onChange, style }) {
  return (
    <IMaskInput
      id={id}
      name={name}
      disabled={disabled}
      className={'form-control'}
      mask='(000) 000-0000'
      value={value}
      onAccept={(value, mask) => onChange(value)}
      placeholder='(123) 456-7890'
      style={style}
      overwrite={true}
      unmask={true} // True to get the raw value without the mask
    />
  );
}
