"use client";

import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
const timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const serverTimezone = () => "UTC";
export function SessionDateTile({ start }: { start: string }) {
  const zone = useSyncExternalStore(subscribe, timezone, serverTimezone);
  const date = new Date(start);
  return (
    <div className="session-date-tile" aria-hidden="true">
      <span>
        {new Intl.DateTimeFormat("en", {
          month: "short",
          timeZone: zone,
        }).format(date)}
      </span>
      <strong>
        {new Intl.DateTimeFormat("en", {
          day: "numeric",
          timeZone: zone,
        }).format(date)}
      </strong>
      <small>
        {new Intl.DateTimeFormat("en", {
          weekday: "short",
          timeZone: zone,
        }).format(date)}
      </small>
    </div>
  );
}
export function TimeRange({ start, end }: { start: string; end?: string }) {
  const zone = useSyncExternalStore(subscribe, timezone, serverTimezone);
  const date = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: zone,
  }).format(new Date(start));
  const time = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: zone,
  });
  return (
    <span className="time-range">
      <time dateTime={start}>
        {date} · {time.format(new Date(start))}
      </time>
      {end && (
        <>
          <span>–</span>
          <time dateTime={end}>{time.format(new Date(end))}</time>
        </>
      )}
      <small>{zone.replaceAll("_", " ")}</small>
    </span>
  );
}
