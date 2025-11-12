import clsx from "clsx";

export default function Button({ className, children, variant="primary", ...props }){
  const base = "inline-flex items-center justify-center rounded-xl px-5 py-2.5 font-semibold transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "text-white bg-[var(--orange-600)] hover:brightness-95",
    gradient: "text-white bg-gradient-to-r from-[var(--orange-600)] to-[var(--amber-500)] hover:brightness-95",
    secondary: "bg-white text-[var(--brown-700)] border border-[var(--line-amber)] hover:bg-[var(--cream-50)]",
  };
  return (
    <button className={clsx(base, styles[variant], className)} {...props}>
      {children}
    </button>
  );
}
