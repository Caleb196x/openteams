type KeyboardEventLike = {
  key: string;
  preventDefault: () => void;
};

export const preventTabFocusChange = (event: KeyboardEventLike): boolean => {
  if (event.key !== 'Tab') return false;
  event.preventDefault();
  return true;
};
