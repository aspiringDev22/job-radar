type AdSlotProps = {
  placement: "sidebar" | "list";
};

export function AdSlot({ placement }: AdSlotProps) {
  return <div data-ad-slot={placement} hidden />;
}
