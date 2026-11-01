type Props = { message?: string | null | false; id?: string };

export default function FieldError({ message, id }: Props) {
  if (!message) return null;
  return <p id={id} data-field-error role="alert"
    className="mt-1 whitespace-normal break-words text-xs font-medium leading-5 text-rose-700 empty:hidden">{message}</p>;
}
