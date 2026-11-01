

export function parseRegistrationCapacity(value:unknown) {
  if(value==null||String(value).trim()==="")return null;
  const capacity=Number(value);
  if(!Number.isSafeInteger(capacity)||capacity<1)throw new Error("Số lượng đăng ký tối đa phải là số nguyên lớn hơn 0.");
  return capacity;
}

