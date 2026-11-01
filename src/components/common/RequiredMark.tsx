export default function RequiredMark({ required = true }: { required?: boolean }) {
  return required ? <span aria-hidden="true" className="ml-1 text-red-600">*</span> : null;
}
