import { Audiowide, VT323 } from "next/font/google";
import "./arcade.css";

const display = Audiowide({ variable: "--font-retro-display", subsets: ["latin"], weight: "400" });
const mono = VT323({ variable: "--font-retro-mono", subsets: ["latin"], weight: "400" });

export default function ArcadeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="arcade-root" className={`${display.variable} ${mono.variable} arcade`}>
      {children}
    </div>
  );
}
