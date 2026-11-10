// Page outlines shown the moment a studio tab is clicked, in the same places as the real content,
// so nothing jumps when the data arrives.
import "@/components/wardrobe/wardrobe.css";
import "@/components/avatar/avatar.css";
import "@/components/outfits/outfits.css";

const Bar = ({ w, h = 10 }: { w: string; h?: number }) => <span className="sk-bar" style={{ width: w, height: h }} />;

export function WardrobeSkeleton() {
  return (
    <div className="wc-studio" aria-busy="true">
      <div className="wc-col">
        <div className="wc-closet">
          <div className="wc-closet-inner sk-pad">
            <Bar w="40%" h={16} />
            <div className="sk-grid">{Array.from({ length: 6 }, (_, i) => <span key={i} className="sk-tile" />)}</div>
          </div>
        </div>
      </div>
      <div className="wc-col wc-center glass">
        <div className="wc-floor" />
        <span className="sk-figure" />
      </div>
      <div className="wc-col flex flex-col gap-3">
        <div className="glass sk-card"><Bar w="45%" /><Bar w="100%" /><Bar w="100%" /><Bar w="100%" /></div>
        <div className="glass sk-card"><Bar w="50%" /><Bar w="80%" /></div>
      </div>
    </div>
  );
}

export function AvatarSkeleton() {
  return (
    <div className="av-page" aria-busy="true">
      <section className="glass av-mine flex flex-col gap-3">
        <Bar w="40%" h={22} />
        <Bar w="70%" />
        <div className="av-grid mt-3">{Array.from({ length: 3 }, (_, i) => <span key={i} className="sk-tile sk-tall" />)}</div>
      </section>
      <section className="glass av-make flex flex-col gap-3">
        <span className="sk-tile" style={{ height: 40 }} />
        <div className="grid grid-cols-3 gap-2">{Array.from({ length: 3 }, (_, i) => <span key={i} className="sk-tile" />)}</div>
        <Bar w="90%" /><Bar w="60%" />
      </section>
    </div>
  );
}

export function OutfitsSkeleton() {
  return (
    <div className="of-page" aria-busy="true">
      <header className="glass of-head"><div className="flex flex-col gap-2"><Bar w="160px" h={22} /><Bar w="240px" /></div></header>
      <div className="of-grid">{Array.from({ length: 4 }, (_, i) => <span key={i} className="glass sk-tile sk-tall" />)}</div>
    </div>
  );
}
