import { useCallback, useEffect, useState } from 'react';
import { synth } from './audio/retroSynth';
import BottomDock from './components/BottomDock';
import CabinViewport, { type WalkRequest } from './components/CabinViewport';
import Header from './components/Header';
import RecruiterCvModal from './components/RecruiterCvModal';
import RpgDialogModal from './components/RpgDialogModal';
import StationContent from './components/StationContent';
import type { StationId } from './data/portfolioData';

export default function App() {
  const [station, setStation] = useState<StationId | null>(null);
  const [cvOpen, setCvOpen] = useState(false);
  const [lampOn, setLampOn] = useState(true);
  const [walkRequest, setWalkRequest] = useState<WalkRequest | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);

  // Audio may only start after a user gesture: unlock on the first one.
  useEffect(() => {
    const unlock = (e: Event) => {
      // The BGM / SFX switches handle audio themselves.
      if ((e.target as Element | null)?.closest?.('[data-audio-toggle]')) return;
      synth.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const openStation = useCallback((id: StationId) => {
    synth.open();
    setStation(id);
  }, []);

  const closeStation = useCallback(() => {
    synth.close();
    setStation(null);
  }, []);

  const toggleLamp = useCallback(() => {
    setLampOn((on) => {
      synth.lamp(!on);
      return !on;
    });
  }, []);

  const selectFromDock = (id: StationId) => {
    synth.click();
    setStation(null);
    setWalkRequest({ id, nonce: Date.now() });
  };

  const showToast = useCallback((label: string) => {
    setToast({ text: `${label} copied to clipboard`, key: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(id);
  }, [toast]);

  // Free the object URL of an uploaded preview photo when it is replaced.
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <Header
        onOpenCv={() => {
          synth.open();
          setCvOpen(true);
        }}
      />

      <main className="relative min-h-0 flex-1 px-2 pb-2 sm:px-4 sm:pb-3">
        <CabinViewport
          lampOn={lampOn}
          onToggleLamp={toggleLamp}
          onStationReached={openStation}
          inputLocked={Boolean(station) || cvOpen}
          walkRequest={walkRequest}
        />
      </main>

      <BottomDock
        active={station}
        onSelect={selectFromDock}
        lampOn={lampOn}
        onToggleLamp={toggleLamp}
      />

      <RpgDialogModal station={station} onClose={closeStation}>
        {station && <StationContent station={station} photoUrl={photoUrl} onPhotoChange={setPhotoUrl} onCopied={showToast} />}
      </RpgDialogModal>

      <RecruiterCvModal
        open={cvOpen}
        onClose={() => {
          synth.close();
          setCvOpen(false);
        }}
        onCopied={showToast}
      />

      {toast && (
        <div
          key={toast.key}
          role="status"
          className="fixed bottom-24 left-1/2 z-[60] rounded-[4px] border-2 border-[#1a0f14] bg-gold px-4 py-2 font-pixel text-sm text-ink shadow-[0_3px_0_#1a0f14]"
          style={{ animation: 'toastIn 180ms ease both' }}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
