import { UserRound, Video } from "lucide-react";
import { Avatar } from "@/components/avatar";

type Person = {
  id: string;
  name: string;
  path?: string | null;
  variant?: number | null;
};

/** Decorative artwork; never substitutes for profile or availability data. */
export function StudioIllustration({ people = [] }: { people?: Person[] }) {
  return (
    <div className="studio-illustration" aria-hidden="true">
      <svg
        className="studio-wires"
        viewBox="0 0 520 280"
        fill="none"
        focusable="false"
      >
        <g stroke="currentColor" strokeWidth="1.4">
          <path d="M172 146H226Q236 146 236 136V83Q236 73 246 73H300" />
          <path d="M236 146V209Q236 219 246 219H300" />
          <path d="M324 73H350Q360 73 360 83V136Q360 146 370 146H402" />
          <path d="M324 219H350Q360 219 360 209V156Q360 146 370 146" />
          <path d="M75 261H280M273 256L280 261L273 266M118 255V267M176 255V267M234 255V267" />
          <path d="M143 38Q125 42 114 63M112 55L114 64L123 60" />
          <path d="M336 31L339 23M345 38L353 33M340 178L345 170M349 185L357 181" />
        </g>
        <circle className="studio-junction" cx="211" cy="146" r="5" />
      </svg>
      <span className="studio-handwritten studio-annotation">
        Where I got stuck
      </span>
      <div className="studio-note">
        <span className="studio-tape" />
        <span className="studio-note-holes" />
        <code>
          def solve(n):
          <br />
          &nbsp; if n &lt;= 1:
          <br />
          &nbsp; &nbsp; return n
        </code>
        <span className="studio-handwritten"># dp state?</span>
      </div>
      {[0, 1].map((index) => (
        <div className={`studio-person studio-person-${index}`} key={index}>
          {people[index] ? (
            <Avatar {...people[index]} size="medium" />
          ) : (
            <UserRound size={28} strokeWidth={1.2} />
          )}
        </div>
      ))}
      <div className="studio-conversation">
        <Video size={23} strokeWidth={1.4} />
        <span>
          Work it out,
          <br />
          <em>together.</em>
        </span>
      </div>
      <span className="studio-axis">
        n − 1&nbsp;&nbsp;&nbsp;&nbsp; n&nbsp;&nbsp;&nbsp;&nbsp; n + 1
      </span>
    </div>
  );
}
