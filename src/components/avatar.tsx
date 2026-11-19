type Props = {
  id: string;
  name: string;
  variant?: number | null;
  path?: string | null;
  size?: "tiny" | "small" | "medium" | "large";
};
function hash(value: string) {
  let n = 2166136261;
  for (const c of value) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function Avatar({
  id,
  name,
  variant = 0,
  path,
  size = "medium",
}: Props) {
  const n = hash(`${id}:${variant || 0}`),
    pick = (values: string[], offset: number) =>
      values[(n >>> offset) % values.length];
  const skin = pick(
    ["#f0c6a5", "#dbab85", "#bb805b", "#8d573c", "#e6b7a2", "#a96b4b"],
    0,
  );
  const hair = pick(["#312329", "#4c302c", "#644132", "#20232a", "#8a5736"], 4);
  const shirt = pick(
    ["#742d43", "#536c82", "#bd8261", "#667b69", "#4e526e", "#9c647a"],
    8,
  );
  const background = pick(
    ["#eedbd8", "#e4e6ef", "#e4ecdf", "#f3e4ce", "#e5dfec", "#dce8e9"],
    12,
  );
  const style = (n >>> 16) % 6;
  const url =
    path && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-images/${path.split("/").map(encodeURIComponent).join("/")}`
      : null;
  return (
    <span
      className={`profile-avatar avatar-${size}`}
      role="img"
      aria-label={`${name}'s profile picture`}
    >
      {url ? (
        // Uploaded portraits use the existing restricted public Storage bucket.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" loading="lazy" />
      ) : (
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <rect width="100" height="100" fill={background} />
          {style === 1 ? (
            <>
              <circle cx="33" cy="30" r="17" fill={hair} />
              <circle cx="51" cy="23" r="20" fill={hair} />
              <circle cx="67" cy="32" r="16" fill={hair} />
            </>
          ) : style === 4 ? (
            <>
              <circle cx="52" cy="18" r="12" fill={hair} />
              <path d="M24 62V35C24 9 76 9 76 35V66Z" fill={hair} />
            </>
          ) : (
            <path
              d={
                style === 5
                  ? "M23 72V34C23 7 78 7 78 36V75L63 64H36Z"
                  : "M27 57V32C27 7 75 9 75 33V58Z"
              }
              fill={hair}
            />
          )}
          <path d="M12 100C14 76 29 68 50 68S86 76 89 100Z" fill={shirt} />
          <rect x="43" y="59" width="14" height="16" rx="6" fill={skin} />
          <circle cx="29" cy="45" r="5" fill={skin} />
          <circle cx="71" cy="45" r="5" fill={skin} />
          <ellipse cx="50" cy="43" rx="21" ry="25" fill={skin} />
          <path
            d={
              style === 2
                ? "M29 35C27 8 73 11 73 36L62 25L50 30L39 23Z"
                : style === 3
                  ? "M27 39C20 14 65 5 73 27C58 24 44 41 27 39Z"
                  : style === 1
                    ? "M29 30C28 12 73 12 72 31L63 26L55 32L45 25L37 31Z"
                    : "M28 33C26 9 73 9 73 33L60 24L43 26L34 23Z"
            }
            fill={hair}
          />
          <circle cx="41" cy="45" r="2" fill="#34232a" />
          <circle cx="59" cy="45" r="2" fill="#34232a" />
          <path
            d="M49 47L47 52H51"
            fill="none"
            stroke="#855944"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M43 57Q50 63 57 57"
            fill="none"
            stroke="#704334"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {n % 4 === 0 && (
            <g fill="none" stroke="#473b42" strokeWidth="1.8">
              <rect x="33" y="39" width="15" height="12" rx="4" />
              <rect x="52" y="39" width="15" height="12" rx="4" />
              <path d="M48 44H52" />
            </g>
          )}
          <path
            d="M39 72L50 82L61 72"
            fill="none"
            stroke="#ffffff"
            strokeOpacity=".45"
            strokeWidth="2"
          />
        </svg>
      )}
    </span>
  );
}
