import { SKILL_MAP } from '../game/data';
import type { SkillOffer, HudState } from '../types';

interface Props {
  offer: SkillOffer;
  hud: HudState;
  onPick: (id: string) => void;
}

export default function SkillModal({ offer, hud, onPick }: Props) {
  const currentLevels: Record<string, number> = {};
  for (const s of hud.skills) currentLevels[s.id] = s.level;

  return (
    <div className="modal-overlay">
      <div className="skill-modal">
        <div className="modal-title-block">
          <div className="modal-icon">✦</div>
          <h2>طلسم جدید بیاموز</h2>
          <p>یکی از سه طلسم زیر را انتخاب کن</p>
        </div>

        <div className="skill-choices">
          {offer.choices.map(id => {
            const def = SKILL_MAP[id];
            const cur = currentLevels[id] || 0;
            const next = cur + 1;
            return (
              <button
                key={id}
                className="skill-choice"
                onClick={() => onPick(id)}
                style={{ borderColor: def.color }}
              >
                <div className="skill-choice-icon" style={{ background: `${def.color}22`, color: def.color }}>
                  {def.icon}
                </div>
                <div className="skill-choice-body">
                  <div className="skill-choice-name">{def.name}</div>
                  <div className="skill-choice-desc">{def.desc}</div>
                  <div className="skill-choice-levels">
                    {cur === 0 ? (
                      <span className="new-tag">جدید</span>
                    ) : (
                      <span className="upgrade-tag">ارتقا {cur} ← {next}</span>
                    )}
                    <span className="level-dots">
                      {[1, 2, 3, 4, 5].map(i => (
                        <span
                          key={i}
                          className={`dot ${i <= next ? 'on' : ''}`}
                          style={i <= next ? { background: def.color } : {}}
                        />
                      ))}
                    </span>
                  </div>
                  <div className="skill-choice-next">
                    ↳ {def.levels[next - 1]}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}