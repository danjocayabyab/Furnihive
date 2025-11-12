import clsx from "clsx";

export default function Input({ className, ...props }){
  return (
    <input
      className={clsx(
        "w-full rounded-xl border bg-white px-4 py-2.5 outline-none placeholder:text-gray-400",
        "border-[var(--line-amber)] focus:ring-4 focus:ring-[var(--amber-400)]/25 focus:border-[var(--amber-500)]",
        className
      )}
      {...props}
    />
  );
}
