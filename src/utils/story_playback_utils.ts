import { StoryElement } from './file_utils';
import { VOICE_CONFIGS } from './story_config';

interface PlaybackInstruction {
  sessionUpdate: {
    voice: typeof VOICE_CONFIGS[keyof typeof VOICE_CONFIGS];
  };
  message: {
    type: 'input_text';
    text: string;
  };
}

export function formatPlaybackInstruction(element: StoryElement): PlaybackInstruction {
  // Determine voice based on element type and character
  const voice = element.type === 'narrate' 
    ? VOICE_CONFIGS.narrator
    : element.character 
      ? VOICE_CONFIGS[element.character as keyof typeof VOICE_CONFIGS]
      : VOICE_CONFIGS.narrator;

  // Format the instruction text
  let instructionText = '[SYSTEM] Please read the following line exactly as written';
  
  // Add emotion context if present
  if (element.emotion) {
    instructionText += ` with ${element.emotion} emotion`;
  }
  
  // Add the actual content to be spoken
  instructionText += `:\n"${element.content}"`;

  return {
    sessionUpdate: {
      voice
    },
    message: {
      type: 'input_text',
      text: instructionText
    }
  };
}