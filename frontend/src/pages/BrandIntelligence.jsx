import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client.js';
import { isDemoMode } from '../lib/features.js';
import BrandProgressHeader from '../components/brand/BrandProgressHeader.jsx';
import BrandSectionCard from '../components/brand/BrandSectionCard.jsx';
import TagInput from '../components/brand/TagInput.jsx';
import ChipSelect from '../components/brand/ChipSelect.jsx';
import ColorInput from '../components/brand/ColorInput.jsx';
import LibraryUpload from '../components/brand/LibraryUpload.jsx';
import {
  createEmptyBrandProfile,
  calculateBrandCompletion,
  GRAPHIC_STYLES,
  TONE_OF_VOICE_OPTIONS,
  MARKETING_GOALS,
  CTA_PRESETS,
  LIBRARY_SECTIONS,
  AUDIENCE_TYPES,
} from '../constants/brandIntelligence.js';
import { useViewport } from '../hooks/useViewport.js';
import '../styles/brand-intelligence.css';

const SAVE_DEBOUNCE_MS = 800;

export default function BrandIntelligence() {
  const { isMobile } = useViewport();
  const [profile, setProfile] = useState(createEmptyBrandProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const saveTimer = useRef(null);
  const skipSave = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getBrandProfile();
      setProfile({ ...createEmptyBrandProfile(), ...data });
      skipSave.current = true;
    } catch (err) {
      if (isDemoMode()) {
        setProfile(createEmptyBrandProfile());
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!isMobile) return;
    window.scrollTo(0, 0);
  }, [stepIndex, isMobile]);

  const persist = useCallback(async (nextProfile) => {
    if (isDemoMode()) {
      setMessage('Modalità demo — il profilo non viene salvato sul server.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const saved = await api.saveBrandProfile(nextProfile);
      setProfile((prev) => ({ ...prev, ...saved }));
      setMessage('Profilo brand sincronizzato.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, []);

  const updateProfile = useCallback((updater) => {
    setProfile((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      next.completionPercent = calculateBrandCompletion(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);

      if (!skipSave.current) {
        saveTimer.current = setTimeout(() => persist(next), SAVE_DEBOUNCE_MS);
      } else {
        skipSave.current = false;
      }

      return next;
    });
  }, [persist]);

  const patch = (section, field, value) => {
    updateProfile((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const addCompetitor = () => {
    updateProfile((prev) => ({
      ...prev,
      competitors: [...prev.competitors, { name: '', website: '', social: '' }],
    }));
  };

  const updateCompetitor = (index, field, value) => {
    updateProfile((prev) => ({
      ...prev,
      competitors: prev.competitors.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeCompetitor = (index) => {
    updateProfile((prev) => ({
      ...prev,
      competitors: prev.competitors.filter((_, i) => i !== index),
    }));
  };

  const toggleCta = (cta) => {
    updateProfile((prev) => {
      const has = prev.preferredCtas.includes(cta);
      return {
        ...prev,
        preferredCtas: has
          ? prev.preferredCtas.filter((c) => c !== cta)
          : [...prev.preferredCtas, cta],
      };
    });
  };

  const steps = useMemo(() => [
    {
      id: 'identity',
      title: 'Identità',
      subtitle: 'Chi sei e cosa rappresenti',
      body: (
        <>
          <div className="bi-form-grid">
            <div className="bi-field">
              <label>Nome azienda</label>
              <input
                value={profile.identity.companyName}
                onChange={(e) => patch('identity', 'companyName', e.target.value)}
                placeholder="Es. NovaPromo"
              />
            </div>
            <div className="bi-field">
              <label>Settore</label>
              <input
                value={profile.identity.sector}
                onChange={(e) => patch('identity', 'sector', e.target.value)}
                placeholder="Es. SaaS, Beauty, Tech"
              />
            </div>
            <div className="bi-field">
              <label>Sito</label>
              <input
                value={profile.identity.website}
                onChange={(e) => patch('identity', 'website', e.target.value)}
                placeholder="https://"
              />
            </div>
            <div className="bi-field">
              <label>Email</label>
              <input
                type="email"
                value={profile.identity.email}
                onChange={(e) => patch('identity', 'email', e.target.value)}
              />
            </div>
            <div className="bi-field">
              <label>Telefono</label>
              <input
                value={profile.identity.phone}
                onChange={(e) => patch('identity', 'phone', e.target.value)}
              />
            </div>
            <div className="bi-field">
              <label>Social</label>
              <input
                value={profile.identity.social}
                onChange={(e) => patch('identity', 'social', e.target.value)}
                placeholder="@handle o link profilo"
              />
            </div>
            <div className="bi-field">
              <label>Anno fondazione</label>
              <input
                value={profile.identity.foundedYear}
                onChange={(e) => patch('identity', 'foundedYear', e.target.value)}
                placeholder="2020"
              />
            </div>
            <div className="bi-field bi-field--full">
              <label>Logo URL</label>
              <input
                value={profile.identity.logoUrl}
                onChange={(e) => patch('identity', 'logoUrl', e.target.value)}
                placeholder="URL logo principale"
              />
            </div>
            <div className="bi-field bi-field--full">
              <label>Descrizione breve</label>
              <textarea
                rows={3}
                value={profile.identity.shortDescription}
                onChange={(e) => patch('identity', 'shortDescription', e.target.value)}
                placeholder="Elevator pitch del brand"
              />
            </div>
            <div className="bi-field bi-field--full">
              <label>Mission</label>
              <textarea
                rows={2}
                value={profile.identity.mission}
                onChange={(e) => patch('identity', 'mission', e.target.value)}
              />
            </div>
            <div className="bi-field bi-field--full">
              <label>Vision</label>
              <textarea
                rows={2}
                value={profile.identity.vision}
                onChange={(e) => patch('identity', 'vision', e.target.value)}
              />
            </div>
          </div>
          <TagInput
            label="Valori"
            value={profile.identity.values}
            onChange={(v) => patch('identity', 'values', v)}
            placeholder="Es. Innovazione"
          />
        </>
      ),
    },
    {
      id: 'brand',
      title: 'Brand',
      subtitle: 'Identità visiva e stile grafico',
      body: (
        <>
          <ColorInput
            label="Colori principali"
            colors={profile.brand.primaryColors}
            onChange={(v) => patch('brand', 'primaryColors', v)}
          />
          <ColorInput
            label="Colori secondari"
            colors={profile.brand.secondaryColors}
            onChange={(v) => patch('brand', 'secondaryColors', v)}
          />
          <TagInput
            label="Palette"
            value={profile.brand.palette}
            onChange={(v) => patch('brand', 'palette', v)}
            placeholder="Nome palette o codice"
          />
          <TagInput
            label="Font"
            value={profile.brand.fonts}
            onChange={(v) => patch('brand', 'fonts', v)}
            placeholder="Es. DM Sans"
          />
          <div className="bi-field">
            <label>Stile grafico</label>
            <ChipSelect
              options={GRAPHIC_STYLES}
              value={profile.brand.graphicStyles}
              onChange={(v) => patch('brand', 'graphicStyles', v)}
            />
          </div>
        </>
      ),
    },
    {
      id: 'target',
      title: 'Target',
      subtitle: 'A chi parli',
      body: (
        <>
          <div className="bi-form-grid">
            <div className="bi-field">
              <label>Età</label>
              <input
                value={profile.target.ageRange}
                onChange={(e) => patch('target', 'ageRange', e.target.value)}
                placeholder="25-45"
              />
            </div>
            <div className="bi-field">
              <label>Professione</label>
              <input
                value={profile.target.profession}
                onChange={(e) => patch('target', 'profession', e.target.value)}
              />
            </div>
            <div className="bi-field">
              <label>Paese</label>
              <input
                value={profile.target.country}
                onChange={(e) => patch('target', 'country', e.target.value)}
              />
            </div>
            <div className="bi-field">
              <label>Lingua</label>
              <input
                value={profile.target.language}
                onChange={(e) => patch('target', 'language', e.target.value)}
                placeholder="Italiano"
              />
            </div>
          </div>
          <div className="bi-field">
            <label>Tipologia audience</label>
            <ChipSelect
              options={AUDIENCE_TYPES}
              value={profile.target.audienceType ? [profile.target.audienceType] : []}
              onChange={(v) => patch('target', 'audienceType', v[0] || '')}
              multiple={false}
            />
          </div>
          <TagInput
            label="Interessi"
            value={profile.target.interests}
            onChange={(v) => patch('target', 'interests', v)}
          />
          <TagInput
            label="Problemi"
            value={profile.target.problems}
            onChange={(v) => patch('target', 'problems', v)}
          />
          <TagInput
            label="Obiettivi"
            value={profile.target.goals}
            onChange={(v) => patch('target', 'goals', v)}
          />
        </>
      ),
    },
    {
      id: 'tone',
      title: 'Tone of Voice',
      subtitle: 'Come comunica il tuo brand',
      body: (
        <ChipSelect
          options={TONE_OF_VOICE_OPTIONS}
          value={profile.toneOfVoice}
          onChange={(v) => updateProfile((prev) => ({ ...prev, toneOfVoice: v }))}
        />
      ),
    },
    {
      id: 'goals',
      title: 'Obiettivi',
      subtitle: 'Cosa vuoi ottenere',
      body: (
        <ChipSelect
          options={MARKETING_GOALS}
          value={profile.marketingGoals}
          onChange={(v) => updateProfile((prev) => ({ ...prev, marketingGoals: v }))}
        />
      ),
    },
    {
      id: 'cta',
      title: 'CTA preferite',
      subtitle: 'Call to action ricorrenti',
      body: (
        <>
          <div className="bi-cta-grid">
            {CTA_PRESETS.map((cta) => (
              <button
                key={cta}
                type="button"
                className={`bi-chip${profile.preferredCtas.includes(cta) ? ' selected' : ''}`}
                onClick={() => toggleCta(cta)}
              >
                {cta}
              </button>
            ))}
          </div>
          <TagInput
            label="CTA personalizzate"
            value={profile.preferredCtas.filter((c) => !CTA_PRESETS.includes(c))}
            onChange={(custom) => {
              const preset = profile.preferredCtas.filter((c) => CTA_PRESETS.includes(c));
              updateProfile((prev) => ({ ...prev, preferredCtas: [...preset, ...custom] }));
            }}
            placeholder="Aggiungi CTA custom"
          />
        </>
      ),
    },
    {
      id: 'words',
      title: 'Parole',
      subtitle: 'Lessico del brand',
      body: (
        <>
          <TagInput
            label="Parole da usare"
            value={profile.words.use}
            onChange={(v) => patch('words', 'use', v)}
          />
          <TagInput
            label="Parole da evitare"
            value={profile.words.avoid}
            onChange={(v) => patch('words', 'avoid', v)}
          />
          <TagInput
            label="Hashtag preferiti"
            value={profile.words.hashtags}
            onChange={(v) => patch('words', 'hashtags', v)}
            placeholder="#brand"
          />
          <TagInput
            label="Emoji preferite"
            value={profile.words.emojis}
            onChange={(v) => patch('words', 'emojis', v)}
            placeholder="✨"
          />
        </>
      ),
    },
    {
      id: 'competitors',
      title: 'Concorrenti',
      subtitle: "Solo riferimento stilistico per l'AI",
      body: (
        <>
          <div className="bi-competitors">
            {profile.competitors.map((comp, index) => (
              <div key={index} className="bi-competitor-card">
                <div className="bi-form-grid">
                  <div className="bi-field">
                    <label>Nome</label>
                    <input
                      value={comp.name}
                      onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                    />
                  </div>
                  <div className="bi-field">
                    <label>Sito</label>
                    <input
                      value={comp.website}
                      onChange={(e) => updateCompetitor(index, 'website', e.target.value)}
                    />
                  </div>
                  <div className="bi-field bi-field--full">
                    <label>Social</label>
                    <input
                      value={comp.social}
                      onChange={(e) => updateCompetitor(index, 'social', e.target.value)}
                    />
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeCompetitor(index)}>
                  Rimuovi
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-secondary" onClick={addCompetitor}>
            + Aggiungi concorrente
          </button>
        </>
      ),
    },
    {
      id: 'library',
      title: 'Libreria Brand',
      subtitle: 'Asset visivi centralizzati',
      body: (
        <div className="bi-library-sections">
          {LIBRARY_SECTIONS.map((section) => (
            <LibraryUpload
              key={section.id}
              category={section.id}
              label={`${section.icon} ${section.label}`}
              items={profile.library?.[section.id] || []}
              onUploaded={(nextProfile) => setProfile((prev) => ({ ...prev, ...nextProfile }))}
            />
          ))}
        </div>
      ),
    },
  ], [profile]); // eslint-disable-line react-hooks/exhaustive-deps -- section bodies bind latest profile/handlers

  if (loading) {
    return (
      <div className="bi-page bi-page--loading">
        <div className="bi-spinner" />
        <p>Caricamento Brand Intelligence…</p>
      </div>
    );
  }

  const safeStep = Math.min(Math.max(stepIndex, 0), steps.length - 1);
  const current = steps[safeStep];
  const isFirst = safeStep === 0;
  const isLast = safeStep === steps.length - 1;

  return (
    <div className={`bi-page${isMobile ? ' bi-page--mobile bi-page--wizard' : ''}`}>
      <div className={isMobile ? 'bi-mobile-sticky' : undefined}>
        <BrandProgressHeader
          completionPercent={profile.completionPercent || 0}
          companyName={profile.identity?.companyName}
          saving={saving}
        />
        {isMobile && (
          <div className="bi-wizard-meta" aria-live="polite">
            <p className="bi-wizard-step-label">
              Passo {safeStep + 1} di {steps.length}
              {' · '}
              <strong>{current.title}</strong>
            </p>
            <div className="bi-wizard-dots" role="tablist" aria-label="Sezioni brand">
              {steps.map((step, i) => (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={i === safeStep}
                  className={`bi-wizard-dot${i === safeStep ? ' is-active' : ''}${i < safeStep ? ' is-done' : ''}`}
                  onClick={() => setStepIndex(i)}
                  title={step.title}
                />
              ))}
            </div>
          </div>
        )}
        {isMobile && saving && (
          <p className="bi-sync-status">Profilo sincronizzato in corso…</p>
        )}
        {isMobile && message && !saving && (
          <p className="bi-sync-status bi-sync-status--ok">{message}</p>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {!isMobile && message && <div className="alert alert-success">{message}</div>}

      {isMobile ? (
        <>
          <section className="bi-wizard-panel mobile-card" key={current.id}>
            <header className="bi-wizard-panel__head">
              <span className="bi-section-index">{String(safeStep + 1).padStart(2, '0')}</span>
              <div>
                <h2>{current.title}</h2>
                {current.subtitle && <p>{current.subtitle}</p>}
              </div>
            </header>
            <div className="bi-wizard-panel__body">{current.body}</div>
          </section>

          <footer className="bi-wizard-footer">
            <button
              type="button"
              className="btn btn-secondary bi-wizard-footer__btn"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={isFirst}
            >
              Indietro
            </button>
            <button
              type="button"
              className="btn btn-primary bi-wizard-footer__btn"
              onClick={() => {
                if (isLast) {
                  setMessage('Profilo brand aggiornato. Puoi tornare quando vuoi a completarlo.');
                  return;
                }
                setStepIndex((i) => Math.min(steps.length - 1, i + 1));
              }}
            >
              {isLast ? 'Fine' : 'Avanti'}
            </button>
          </footer>
        </>
      ) : (
        <div className="bi-sections">
          {steps.map((step, index) => (
            <BrandSectionCard
              key={step.id}
              index={index + 1}
              title={step.title}
              subtitle={step.subtitle}
              delay={index * 80}
              accordion={false}
            >
              {step.body}
            </BrandSectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
