// src/services/soundService.ts
import { Howl, Howler } from 'howler';

export interface SoundDefinition { // Exporting for potential use elsewhere, e.g. for type safety in components
  name: string;
  path: string;
  loop?: boolean;
  volume?: number;
  isMusic?: boolean;
}

class SoundService {
  private sounds: Map<string, Howl> = new Map();
  private musicVolume: number = 0.5; // Default global music volume
  private sfxVolume: number = 0.8;   // Default global SFX volume

  constructor() {
    // Howler.volume(0.7); // Example: Set a global volume for all sounds if desired.
    // For now, we'll manage volume per sound type (music/sfx) or individual sound.
  }

  public loadSounds(definitions: SoundDefinition[]): Promise<void[]> {
    const promises = definitions.map(def => this.loadSound(def));
    return Promise.all(promises);
  }

  private loadSound(definition: SoundDefinition): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.sounds.has(definition.name)) {
        // console.log(`SoundService: Sound ${definition.name} already loaded.`);
        resolve();
        return;
      }

      const baseVolume = definition.isMusic ? this.musicVolume : this.sfxVolume;
      const soundSpecificVolume = definition.volume !== undefined ? definition.volume : 1.0;
      const finalVolume = soundSpecificVolume * baseVolume;

      const sound = new Howl({
        src: [definition.path],
        loop: definition.loop || false,
        volume: finalVolume,
        html5: definition.isMusic || false, // Often recommended for music to use HTML5 audio for longer tracks
        onload: () => {
          // console.log(`SoundService: Sound loaded - ${definition.name}`);
          this.sounds.set(definition.name, sound);
          resolve();
        },
        onloaderror: (_id, error) => {
          console.error(`SoundService: Error loading sound ${definition.name} from ${definition.path}:`, error);
          reject(error);
        },
        onplayerror: (_id, error) => {
          console.error(`SoundService: Error playing sound ${definition.name}:`, error);
          // Potentially try to unlock audio context if it's an interaction issue
          if (Howler.ctx && Howler.ctx.state === 'suspended') {
            Howler.ctx.resume().then(() => {
              // console.log("AudioContext resumed by playerror handler");
              // sound.play(); // Optionally retry playing
            }).catch(e => console.error("Error resuming AudioContext:", e));
          }
        }
      });
    });
  }

  public playSound(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      // console.log(`SoundService: Playing sound - ${name}`);
      sound.play();
    } else {
      console.warn(`SoundService: Sound not found to play - ${name}`);
    }
  }

  public stopSound(name: string): void {
    const sound = this.sounds.get(name);
    if (sound) {
      // console.log(`SoundService: Stopping sound - ${name}`);
      sound.stop();
    } else {
      console.warn(`SoundService: Sound not found to stop - ${name}`);
    }
  }

  public stopAllSounds(): void {
    // console.log("SoundService: Stopping all sounds.");
    this.sounds.forEach(sound => {
      sound.stop();
    });
    // Or use Howler.stop(); which stops all sounds globally.
    // Howler.stop();
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
    this.sounds.forEach((sound, name) => {
        // This requires knowing which sounds are music. We stored `isMusic` on definition.
        // To apply this dynamically, we'd need to access the original definition or store `isMusic` on the Howl instance (e.g., sound._isMusic = def.isMusic)
        // For now, this will only affect subsequently loaded music or if we re-calculate volumes.
        // A more robust way is to iterate definitions that were used to load sounds if available,
        // or query the Howl instance if we've attached custom properties.
        const soundDefinition = SOUND_DEFINITIONS.find(def => def.name === name);
        if (soundDefinition && soundDefinition.isMusic) {
            const soundSpecificVolume = soundDefinition.volume !== undefined ? soundDefinition.volume : 1.0;
            sound.volume(soundSpecificVolume * this.musicVolume);
        }
    });
    // console.log(`SoundService: Music volume set to ${this.musicVolume}`);
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
     this.sounds.forEach((sound, name) => {
        const soundDefinition = SOUND_DEFINITIONS.find(def => def.name === name);
        if (soundDefinition && !soundDefinition.isMusic) {
            const soundSpecificVolume = soundDefinition.volume !== undefined ? soundDefinition.volume : 1.0;
            sound.volume(soundSpecificVolume * this.sfxVolume);
        }
    });
    // console.log(`SoundService: SFX volume set to ${this.sfxVolume}`);
  }

  // Call this on first user interaction if sounds don't play due to browser policy
  public unlockAudio(): void {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().then(() => {
        // console.log("AudioContext resumed!");
      }).catch(e => console.error("Error resuming AudioContext:", e));
    }
  }
}

const soundService = new SoundService();
export default soundService;

// Define sound assets (paths will need to be created/verified)
// These are placeholders for now. Actual files need to be added to public/assets/sounds/
export const SOUND_DEFINITIONS: SoundDefinition[] = [
  // UI Sounds
  { name: 'ui_hover', path: '/assets/sounds/ui_hover.wav', volume: 0.5 },
  { name: 'ui_click', path: '/assets/sounds/ui_click.wav', volume: 0.7 },
  { name: 'ui_modal_open', path: '/assets/sounds/ui_modal_open.wav', volume: 0.6 },
  { name: 'ui_modal_close', path: '/assets/sounds/ui_modal_close.wav', volume: 0.6 },
  { name: 'ui_click_match', path: '/assets/sounds/ui_click_match.wav', volume: 0.7 },

  // Ambience Music
  { name: 'music_hub', path: '/assets/sounds/music_hub.mp3', loop: true, isMusic: true, volume: 0.7 },
  { name: 'music_game', path: '/assets/sounds/music_game.mp3', loop: true, isMusic: true, volume: 0.7 },

  // Action Sounds
  { name: 'action_dice_roll', path: '/assets/sounds/action_dice_roll.wav', volume: 0.8 },
  { name: 'action_pawn_move', path: '/assets/sounds/action_pawn_move.wav', volume: 0.6 },
  { name: 'action_spell_cast_generic', path: '/assets/sounds/action_spell_cast_generic.wav', volume: 0.7 },
  { name: 'action_spell_impact_generic', path: '/assets/sounds/action_spell_impact_generic.wav', volume: 0.7 }, // Added spell impact
  { name: 'action_event_card', path: '/assets/sounds/action_event_card.wav', volume: 0.7 },
  { name: 'action_minigame_success', path: '/assets/sounds/action_minigame_success.wav', volume: 0.8 },
  { name: 'action_minigame_fail', path: '/assets/sounds/action_minigame_fail.wav', volume: 0.8 },
  { name: 'action_shield_gain', path: '/assets/sounds/action_shield_gain.wav', volume: 0.7 },
  { name: 'action_trap_set', path: '/assets/sounds/action_trap_set.wav', volume: 0.7 },
  { name: 'action_mana_gain', path: '/assets/sounds/action_mana_gain.wav', volume: 0.6 },
  { name: 'action_mana_loss', path: '/assets/sounds/action_mana_loss.wav', volume: 0.6 },
];

// Example of how to preload sounds (e.g., in App.tsx or main.tsx on initial load)
/*
soundService.loadSounds(SOUND_DEFINITIONS)
  .then(() => console.log("All sounds preloaded successfully via soundService."))
  .catch(error => console.error("Error preloading sounds via soundService:", error));
*/

// Example of how to unlock audio context on user interaction
/*
document.addEventListener('click', () => {
  soundService.unlockAudio();
}, { once: true });
*/
